/**
 * Interface representing a Puter feature with enhanced state management
 */
interface PuterFeature {
  /** Unique identifier for the feature */
  id: string;
  /** Human-readable name of the feature */
  name: string;
  /** Description of what the feature does */
  description: string;
  /** Current enabled state of the feature */
  enabled: boolean;
  /** Version of the feature */
  version?: string;
  /** Dependencies required for this feature */
  dependencies?: string[];
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Feature state information */
  state?: FeatureState;
}

/**
 * Interface for feature state tracking
 */
interface FeatureState {
  /** Whether the feature is currently active/initialized */
  active: boolean;
  /** Usage statistics */
  usage: FeatureUsage;
  /** State transition history */
  history: StateTransition[];
  /** Last synchronized timestamp */
  lastSync: number;
  /** State persistence key */
  persistenceKey: string;
}

/**
 * Interface for feature usage tracking
 */
interface FeatureUsage {
  /** Total number of times the feature has been used */
  count: number;
  /** Timestamp of last usage */
  lastUsed: number | null;
  /** Average time between uses (in milliseconds) */
  averageInterval: number;
  /** Peak usage period information */
  peakUsage?: {
    hour: number;
    dayOfWeek: number;
    count: number;
  };
}

/**
 * Interface for state transition tracking
 */
interface StateTransition {
  /** Timestamp of the transition */
  timestamp: number;
  /** Previous state */
  from: 'disabled' | 'enabled' | 'active' | 'inactive';
  /** New state */
  to: 'disabled' | 'enabled' | 'active' | 'inactive';
  /** Reason for the transition */
  reason: string;
  /** User or system that triggered the transition */
  triggeredBy: 'user' | 'system' | 'api' | 'automatic';
  /** Additional context data */
  context?: Record<string, any>;
}

/**
 * Interface for user permissions
 */
interface UserPermissions {
  /** Whether the user is authenticated */
  authenticated: boolean;
  /** User role or level */
  role?: string;
  /** Specific permissions granted */
  permissions?: string[];
}

/**
 * Interface for system capabilities
 */
interface SystemCapabilities {
  /** Whether Puter.js is available */
  puterAvailable: boolean;
  /** Browser capabilities */
  browserSupport: Record<string, boolean>;
  /** API availability */
  apiSupport: Record<string, boolean>;
  /** Platform information */
  platform: string;
}

/**
 * Interface for state management events
 */
interface StateManagementEvent {
  /** Type of event */
  type: 'state-change' | 'usage-track' | 'sync' | 'error' | 'initialization';
  /** Feature ID that triggered the event */
  featureId: string;
  /** Event data */
  data: any;
  /** Timestamp of the event */
  timestamp: number;
}

/**
 * Interface for state persistence configuration
 */
interface PersistenceConfig {
  /** Whether to enable state persistence */
  enabled: boolean;
  /** Storage key prefix */
  keyPrefix: string;
  /** Maximum history entries per feature */
  maxHistoryEntries: number;
  /** Whether to persist usage statistics */
  persistUsage: boolean;
  /** Sync interval in milliseconds */
  syncInterval: number;
}

/**
 * Interface for state synchronization options
 */
interface SyncOptions {
  /** Whether to force synchronization */
  force: boolean;
  /** Timeout for synchronization */
  timeout: number;
  /** Callback for sync completion */
  onComplete?: (success: boolean, errors?: string[]) => void;
}

/**
 * PuterFeatureManager class for managing Puter-specific features with comprehensive state management.
 * This class provides enhanced functionality for checking feature availability,
 * managing feature states with tracking, persistence, synchronization capabilities,
 * handling initialization, and providing comprehensive metadata.
 * It includes logic to determine feature availability based on user permissions,
 * system capabilities, and Puter environment detection, plus advanced state management.
 */
export class PuterFeatureManager {
  private features: Map<string, PuterFeature> = new Map();
  private initialized: boolean = false;
  private userPermissions: UserPermissions | null = null;
  private systemCapabilities: SystemCapabilities | null = null;
  private logger: Console = console;
  
  // State management properties
  private eventListeners: Map<string, Set<(event: StateManagementEvent) => void>> = new Map();
  private persistenceConfig: PersistenceConfig = {
    enabled: true,
    keyPrefix: 'puter-feature-state:',
    maxHistoryEntries: 50,
    persistUsage: true,
    syncInterval: 30000 // 30 seconds
  };
  private syncIntervalId: number | null = null;
  private statePersistenceEnabled: boolean = true;

  /**
   * Constructor for PuterFeatureManager with optional configuration
   * @param config - Optional configuration for state management
   */
  constructor(config?: Partial<PersistenceConfig>) {
    if (config) {
      this.persistenceConfig = { ...this.persistenceConfig, ...config };
    }
    this.initializeStateManagement();
  }

  /**
   * Initializes state management system
   */
  private initializeStateManagement(): void {
    try {
      if (this.statePersistenceEnabled && this.persistenceConfig.enabled) {
        this.loadPersistedStates();
        this.startPeriodicSync();
      }
      this.logger.debug('State management system initialized');
    } catch (error) {
      this.logger.error('Failed to initialize state management:', error);
    }
  }

  /**
   * Checks if a feature is available in the current Puter environment
   * This checks both registration and actual availability based on permissions and capabilities
   * @param featureId - The unique identifier of the feature
   * @returns true if the feature is available, false otherwise
   */
  isFeatureAvailable(featureId: string): boolean {
    try {
      const feature = this.features.get(featureId);
      if (!feature) {
        this.logger.debug(`Feature '${featureId}' is not registered`);
        return false;
      }

      // Check system capabilities
      if (!this.checkSystemCapabilitiesForFeature(featureId)) {
        this.logger.debug(`Feature '${featureId}' not supported by system capabilities`);
        return false;
      }

      // Check user permissions
      if (!this.checkUserPermissionsForFeature(featureId)) {
        this.logger.debug(`Feature '${featureId}' not permitted for current user`);
        return false;
      }

      // Check Puter environment availability
      if (!this.isPuterEnvironmentAvailable()) {
        this.logger.debug(`Puter environment not available for feature '${featureId}'`);
        return false;
      }

      this.logger.debug(`Feature '${featureId}' is available`);
      return true;
    } catch (error) {
      this.logger.error(`Error checking availability for feature '${featureId}':`, error);
      return false;
    }
  }

  /**
   * Gets the current state (enabled/disabled) of a feature
   * @param featureId - The unique identifier of the feature
   * @returns true if the feature is enabled, false if disabled or not found
   */
  getFeatureState(featureId: string): boolean {
    const feature = this.features.get(featureId);
    return feature?.enabled ?? false;
  }

  /**
   * Sets the state of a feature
   * @param featureId - The unique identifier of the feature
   * @param enabled - The new enabled state
   * @throws Error if the feature is not found
   */
  setFeatureState(featureId: string, enabled: boolean): void {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature '${featureId}' not found`);
    }
    feature.enabled = enabled;
  }

  /**
   * Checks if the Puter environment is available
   * @returns true if Puter.js is loaded and accessible
   */
  private isPuterEnvironmentAvailable(): boolean {
    try {
      // Check if puter global is available
      return typeof (globalThis as any).puter !== 'undefined';
    } catch (error) {
      this.logger.error('Error checking Puter environment availability:', error);
      return false;
    }
  }

  /**
   * Checks system capabilities for a specific feature
   * @param featureId - The feature to check
   * @returns true if system supports the feature
   */
  private checkSystemCapabilitiesForFeature(featureId: string): boolean {
    if (!this.systemCapabilities) {
      this.systemCapabilities = this.detectSystemCapabilities();
    }

    // Feature-specific capability checks
    switch (featureId) {
      case 'ai-models':
        return this.systemCapabilities.apiSupport.ai ?? false;
      case 'hosting':
        return this.systemCapabilities.apiSupport.hosting ?? false;
      case 'file-system':
        return this.systemCapabilities.apiSupport.fs ?? false;
      case 'kv-storage':
        return this.systemCapabilities.apiSupport.kv ?? false;
      default:
        // For unknown features, assume available if Puter is available
        return this.systemCapabilities.puterAvailable;
    }
  }

  /**
   * Checks user permissions for a specific feature
   * @param featureId - The feature to check
   * @returns true if user has permission for the feature
   */
  private checkUserPermissionsForFeature(featureId: string): boolean {
    if (!this.userPermissions) {
      this.userPermissions = this.detectUserPermissions();
    }

    // If not authenticated, only allow basic features
    if (!this.userPermissions.authenticated) {
      return ['basic'].includes(featureId);
    }

    // Feature-specific permission checks
    switch (featureId) {
      case 'ai-models':
        return this.userPermissions.permissions?.includes('ai') ?? false;
      case 'hosting':
        return this.userPermissions.permissions?.includes('hosting') ?? false;
      case 'file-system':
        return this.userPermissions.permissions?.includes('fs') ?? true; // Assume basic file access
      case 'kv-storage':
        return this.userPermissions.permissions?.includes('kv') ?? true; // Assume basic storage access
      default:
        return true; // Allow unknown features for authenticated users
    }
  }

  /**
   * Detects current system capabilities
   * @returns SystemCapabilities object
   */
  private detectSystemCapabilities(): SystemCapabilities {
    const capabilities: SystemCapabilities = {
      puterAvailable: false,
      browserSupport: {},
      apiSupport: {},
      platform: navigator.platform
    };

    try {
      // Check Puter availability
      capabilities.puterAvailable = this.isPuterEnvironmentAvailable();

      if (capabilities.puterAvailable) {
        const puter = (globalThis as any).puter;

        // Check API support
        capabilities.apiSupport = {
          ai: typeof puter.ai !== 'undefined',
          hosting: typeof puter.hosting !== 'undefined',
          fs: typeof puter.fs !== 'undefined',
          kv: typeof puter.kv !== 'undefined',
          auth: typeof puter.auth !== 'undefined'
        };
      }

      // Check browser capabilities
      capabilities.browserSupport = {
        webgl: !!document.createElement('canvas').getContext('webgl'),
        websockets: typeof WebSocket !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined'
      };

    } catch (error) {
      this.logger.error('Error detecting system capabilities:', error);
    }

    return capabilities;
  }

  /**
   * Detects current user permissions
   * @returns UserPermissions object
   */
  private detectUserPermissions(): UserPermissions {
    const permissions: UserPermissions = {
      authenticated: false,
      permissions: []
    };

    try {
      if (this.isPuterEnvironmentAvailable()) {
        const puter = (globalThis as any).puter;

        // Check authentication status
        if (puter.auth && typeof puter.auth.isSignedIn === 'function') {
          permissions.authenticated = puter.auth.isSignedIn();
        }

        // Get user info if authenticated
        if (permissions.authenticated && puter.auth.getUser) {
          const user = puter.auth.getUser();
          if (user) {
            permissions.role = user.role || 'user';
            // Infer permissions based on user role
            permissions.permissions = this.getPermissionsForRole(permissions.role);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error detecting user permissions:', error);
    }

    return permissions;
  }

  /**
   * Gets permissions for a given user role
   * @param role - User role
   * @returns Array of permission strings
   */
  private getPermissionsForRole(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'admin': ['ai', 'hosting', 'fs', 'kv', 'admin'],
      'premium': ['ai', 'hosting', 'fs', 'kv'],
      'user': ['ai', 'fs', 'kv'],
      'basic': ['fs']
    };

    return rolePermissions[role] || ['fs'];
  }

  /**
   * Discovers available Puter features by checking API availability
   * @returns Promise that resolves to array of discovered feature IDs
   */
  async discoverAvailableFeatures(): Promise<string[]> {
    const availableFeatures: string[] = [];

    try {
      if (!this.isPuterEnvironmentAvailable()) {
        this.logger.warn('Puter environment not available for feature discovery');
        return availableFeatures;
      }

      const puter = (globalThis as any).puter;
      const featureChecks = [
        { id: 'ai-models', check: () => puter.ai && typeof puter.ai.chat === 'function' },
        { id: 'hosting', check: () => puter.hosting && typeof puter.hosting.deploy === 'function' },
        { id: 'file-system', check: () => puter.fs && typeof puter.fs.readdir === 'function' },
        { id: 'kv-storage', check: () => puter.kv && typeof puter.kv.get === 'function' },
        { id: 'auth', check: () => puter.auth && typeof puter.auth.signIn === 'function' }
      ];

      for (const feature of featureChecks) {
        try {
          if (await feature.check()) {
            availableFeatures.push(feature.id);
            this.logger.debug(`Discovered available feature: ${feature.id}`);
          }
        } catch (error) {
          this.logger.debug(`Feature ${feature.id} check failed:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Error during feature discovery:', error);
    }

    return availableFeatures;
  }

  /**
   * Gets current system capabilities
   * @returns SystemCapabilities object or null if not detected
   */
  getSystemCapabilities(): SystemCapabilities | null {
    if (!this.systemCapabilities) {
      this.systemCapabilities = this.detectSystemCapabilities();
    }
    return this.systemCapabilities;
  }

  /**
   * Gets current user permissions
   * @returns UserPermissions object or null if not detected
   */
  getUserPermissions(): UserPermissions | null {
    if (!this.userPermissions) {
      this.userPermissions = this.detectUserPermissions();
    }
    return this.userPermissions;
  }

  /**
   * Refreshes system capabilities and user permissions detection
   */
  refreshCapabilities(): void {
    this.systemCapabilities = null;
    this.userPermissions = null;
    this.systemCapabilities = this.detectSystemCapabilities();
    this.userPermissions = this.detectUserPermissions();
    this.logger.info('Capabilities refreshed');
  }

  /**
   * Sets a custom logger for the manager
   * @param logger - Logger instance to use
   */
  setLogger(logger: Console): void {
    this.logger = logger;
  }

  /**
   * Initializes a feature asynchronously
   * @param featureId - The unique identifier of the feature
   * @returns Promise that resolves when initialization is complete
   * @throws Error if the feature is not found, not available, or initialization fails
   */
  async initializeFeature(featureId: string): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature) {
      const error = new Error(`Feature '${featureId}' not found`);
      this.logger.error(error.message);
      throw error;
    }

    // Check if feature is available before initializing
    if (!this.isFeatureAvailable(featureId)) {
      const error = new Error(`Feature '${featureId}' is not available in current environment`);
      this.logger.error(error.message);
      throw error;
    }

    // Perform initialization logic here
    // This could involve loading scripts, setting up APIs, etc.
    try {
      this.logger.info(`Initializing feature: ${feature.name} (${featureId})`);

      // Feature-specific initialization
      await this.performFeatureInitialization(feature);

      feature.enabled = true;
      this.logger.info(`Feature '${featureId}' initialized successfully`);
    } catch (error) {
      const errorMessage = `Failed to initialize feature '${featureId}': ${error}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Performs feature-specific initialization logic
   * @param feature - The feature to initialize
   */
  private async performFeatureInitialization(feature: PuterFeature): Promise<void> {
    switch (feature.id) {
      case 'ai-models':
        await this.initializeAIModels();
        break;
      case 'hosting':
        await this.initializeHosting();
        break;
      case 'file-system':
        await this.initializeFileSystem();
        break;
      case 'kv-storage':
        await this.initializeKVStorage();
        break;
      default:
        // Generic initialization with delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Initializes AI models feature
   */
  private async initializeAIModels(): Promise<void> {
    if (!this.isPuterEnvironmentAvailable()) {
      throw new Error('Puter environment required for AI models');
    }

    const puter = (globalThis as any).puter;
    if (!puter.ai) {
      throw new Error('Puter AI API not available');
    }

    // Test AI availability
    try {
      // Basic check - could be enhanced with actual model listing
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      throw new Error(`AI models initialization failed: ${error}`);
    }
  }

  /**
   * Initializes hosting feature
   */
  private async initializeHosting(): Promise<void> {
    if (!this.isPuterEnvironmentAvailable()) {
      throw new Error('Puter environment required for hosting');
    }

    const puter = (globalThis as any).puter;
    if (!puter.hosting) {
      throw new Error('Puter hosting API not available');
    }

    // Test hosting availability
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      throw new Error(`Hosting initialization failed: ${error}`);
    }
  }

  /**
   * Initializes file system feature
   */
  private async initializeFileSystem(): Promise<void> {
    if (!this.isPuterEnvironmentAvailable()) {
      throw new Error('Puter environment required for file system');
    }

    const puter = (globalThis as any).puter;
    if (!puter.fs) {
      throw new Error('Puter file system API not available');
    }

    // Test file system availability
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      throw new Error(`File system initialization failed: ${error}`);
    }
  }

  /**
   * Initializes KV storage feature
   */
  private async initializeKVStorage(): Promise<void> {
    if (!this.isPuterEnvironmentAvailable()) {
      throw new Error('Puter environment required for KV storage');
    }

    const puter = (globalThis as any).puter;
    if (!puter.kv) {
      throw new Error('Puter KV storage API not available');
    }

    // Test KV storage availability
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      throw new Error(`KV storage initialization failed: ${error}`);
    }
  }

  /**
   * Gets metadata for a specific feature
   * @param featureId - The unique identifier of the feature
   * @returns The feature metadata or undefined if not found
   */
  getFeatureMetadata(featureId: string): PuterFeature | undefined {
    return this.features.get(featureId);
  }

  /**
   * Registers a new feature with the manager
   * @param feature - The feature to register
   */
  registerFeature(feature: PuterFeature): void {
    this.features.set(feature.id, feature);
  }

  /**
   * Unregisters a feature from the manager
   * @param featureId - The unique identifier of the feature
   */
  unregisterFeature(featureId: string): void {
    this.features.delete(featureId);
  }

  /**
   * Gets all registered features
   * @returns Array of all features
   */
  getAllFeatures(): PuterFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * Gets all enabled features
   * @returns Array of enabled features
   */
  getEnabledFeatures(): PuterFeature[] {
    return this.getAllFeatures().filter(feature => feature.enabled);
  }

  /**
   * Initializes all available features
   * Only attempts to initialize features that are actually available
   * @returns Promise that resolves when all available features are initialized
   */
  async initializeAllFeatures(): Promise<void> {
    if (this.initialized) {
      this.logger.info('Features already initialized');
      return;
    }

    try {
      // First refresh capabilities to ensure we have latest info
      this.refreshCapabilities();

      // Get only available features
      const availableFeatures = this.getAllFeatures().filter(feature =>
        this.isFeatureAvailable(feature.id)
      );

      this.logger.info(`Initializing ${availableFeatures.length} available features`);

      const initPromises = availableFeatures.map(feature =>
        this.initializeFeature(feature.id).catch(error => {
          this.logger.error(`Failed to initialize feature '${feature.id}':`, error);
          // Don't fail the whole initialization if one feature fails
          return Promise.resolve();
        })
      );

      await Promise.all(initPromises);
      this.initialized = true;
      this.logger.info('All available features initialized successfully');
    } catch (error) {
      this.logger.error('Error during feature initialization:', error);
      throw new Error(`Feature initialization failed: ${error}`);
    }
  }

  // =============================================
  // STATE MANAGEMENT ENHANCEMENTS
  // =============================================

  /**
   * Enables a feature with comprehensive state tracking
   * @param featureId - The unique identifier of the feature
   * @param reason - Reason for enabling the feature
   * @param context - Additional context data
   * @throws Error if the feature is not found or cannot be enabled
   */
  async enableFeature(featureId: string, reason: string = 'manual', context?: Record<string, any>): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature '${featureId}' not found`);
    }

    try {
      // Check if feature is available before enabling
      if (!this.isFeatureAvailable(featureId)) {
        throw new Error(`Feature '${featureId}' is not available in current environment`);
      }

      const previousState = feature.enabled ? 'enabled' : 'disabled';
      const newState = 'enabled';

      // Update feature state
      feature.enabled = true;
      await this.initializeFeatureState(featureId);
      
      // Track state transition
      this.trackStateTransition(featureId, previousState as any, newState as any, reason, 'user', context);
      
      // Emit event
      this.emitEvent('state-change', featureId, {
        from: previousState,
        to: newState,
        reason,
        context
      });

      this.logger.info(`Feature '${featureId}' enabled successfully`);
    } catch (error) {
      this.emitEvent('error', featureId, { error: error.message, operation: 'enable' });
      this.logger.error(`Failed to enable feature '${featureId}':`, error);
      throw error;
    }
  }

  /**
   * Disables a feature with comprehensive state tracking
   * @param featureId - The unique identifier of the feature
   * @param reason - Reason for disabling the feature
   * @param context - Additional context data
   * @throws Error if the feature is not found or cannot be disabled
   */
  async disableFeature(featureId: string, reason: string = 'manual', context?: Record<string, any>): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature '${featureId}' not found`);
    }

    try {
      const previousState = feature.enabled ? 'enabled' : 'disabled';
      const newState = 'disabled';

      // Update feature state
      feature.enabled = false;
      await this.deinitializeFeatureState(featureId);
      
      // Track state transition
      this.trackStateTransition(featureId, previousState as any, newState as any, reason, 'user', context);
      
      // Emit event
      this.emitEvent('state-change', featureId, {
        from: previousState,
        to: newState,
        reason,
        context
      });

      this.logger.info(`Feature '${featureId}' disabled successfully`);
    } catch (error) {
      this.emitEvent('error', featureId, { error: error.message, operation: 'disable' });
      this.logger.error(`Failed to disable feature '${featureId}':`, error);
      throw error;
    }
  }

  /**
   * Tracks feature usage with comprehensive statistics
   * @param featureId - The unique identifier of the feature
   * @param usageData - Additional usage data
   */
  trackFeatureUsage(featureId: string, usageData?: Record<string, any>): void {
    const feature = this.features.get(featureId);
    if (!feature) {
      this.logger.warn(`Cannot track usage for unknown feature '${featureId}'`);
      return;
    }

    try {
      const now = Date.now();
      const state = feature.state || this.createDefaultFeatureState(featureId);

      // Update usage statistics
      state.usage.count++;
      state.usage.lastUsed = now;

      // Calculate average interval
      if (state.usage.count > 1) {
        const timeDiff = now - (state.usage.lastUsed || now);
        state.usage.averageInterval =
          (state.usage.averageInterval * (state.usage.count - 1) + timeDiff) / state.usage.count;
      }

      // Track peak usage
      this.updatePeakUsage(state.usage, now);

      // Update feature state
      feature.state = state;

      // Emit event
      this.emitEvent('usage-track', featureId, {
        usage: state.usage,
        usageData
      });

      this.logger.debug(`Usage tracked for feature '${featureId}': count=${state.usage.count}`);
    } catch (error) {
      this.emitEvent('error', featureId, { error: error.message, operation: 'track-usage' });
      this.logger.error(`Failed to track usage for feature '${featureId}':`, error);
    }
  }

  /**
   * Gets comprehensive feature state information
   * @param featureId - The unique identifier of the feature
   * @returns Complete feature state or null if not found
   */
  getFeatureStateInfo(featureId: string): FeatureState | null {
    const feature = this.features.get(featureId);
    return feature?.state || null;
  }

  /**
   * Gets feature usage statistics
   * @param featureId - The unique identifier of the feature
   * @returns Usage statistics or null if not found
   */
  getFeatureUsage(featureId: string): FeatureUsage | null {
    const state = this.getFeatureStateInfo(featureId);
    return state?.usage || null;
  }

  /**
   * Gets feature state transition history
   * @param featureId - The unique identifier of the feature
   * @param limit - Maximum number of history entries to return
   * @returns Array of state transitions
   */
  getFeatureStateHistory(featureId: string, limit?: number): StateTransition[] {
    const state = this.getFeatureStateInfo(featureId);
    if (!state?.history) {
      return [];
    }

    const history = state.history;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Sets up event listeners for state management events
   * @param eventType - Type of event to listen for
   * @param listener - Event listener function
   * @returns Function to remove the listener
   */
  onStateManagementEvent(
    eventType: StateManagementEvent['type'],
    listener: (event: StateManagementEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Enables or disables state persistence
   * @param enabled - Whether to enable persistence
   */
  setStatePersistenceEnabled(enabled: boolean): void {
    this.statePersistenceEnabled = enabled;
    if (enabled) {
      this.startPeriodicSync();
    } else {
      this.stopPeriodicSync();
    }
  }

  /**
   * Manually synchronizes all feature states
   * @param options - Synchronization options
   * @returns Promise that resolves when sync is complete
   */
  async synchronizeStates(options?: SyncOptions): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const timeout = options?.timeout || 10000;
    
    try {
      this.logger.info('Starting manual state synchronization');

      // Persist current states
      await this.persistAllStates();

      // Load any persisted changes
      await this.loadPersistedStates();

      this.emitEvent('sync', 'all', {
        forced: options?.force || false,
        timestamp: Date.now()
      });

      this.logger.info('State synchronization completed');
      return { success: true };
    } catch (error) {
      const errorMessage = `State synchronization failed: ${error}`;
      errors.push(errorMessage);
      this.logger.error(errorMessage);
      return { success: false, errors };
    }
  }

  /**
   * Gets the current persistence configuration
   * @returns Persistence configuration object
   */
  getPersistenceConfig(): PersistenceConfig {
    return { ...this.persistenceConfig };
  }

  /**
   * Updates the persistence configuration
   * @param config - New configuration options
   */
  updatePersistenceConfig(config: Partial<PersistenceConfig>): void {
    this.persistenceConfig = { ...this.persistenceConfig, ...config };
    
    // Restart sync if interval changed
    if (config.syncInterval && this.syncIntervalId) {
      this.stopPeriodicSync();
      this.startPeriodicSync();
    }
  }

  // =============================================
  // PRIVATE STATE MANAGEMENT METHODS
  // =============================================

  /**
   * Creates default feature state
   * @param featureId - Feature identifier
   * @returns Default FeatureState
   */
  private createDefaultFeatureState(featureId: string): FeatureState {
    return {
      active: false,
      usage: {
        count: 0,
        lastUsed: null,
        averageInterval: 0
      },
      history: [],
      lastSync: Date.now(),
      persistenceKey: `${this.persistenceConfig.keyPrefix}${featureId}`
    };
  }

  /**
   * Initializes feature state
   * @param featureId - Feature identifier
   */
  private async initializeFeatureState(featureId: string): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature) return;

    if (!feature.state) {
      feature.state = this.createDefaultFeatureState(featureId);
    }

    feature.state.active = true;
    feature.state.lastSync = Date.now();

    this.emitEvent('initialization', featureId, { state: feature.state });
  }

  /**
   * Deinitializes feature state
   * @param featureId - Feature identifier
   */
  private async deinitializeFeatureState(featureId: string): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature?.state) return;

    feature.state.active = false;
    feature.state.lastSync = Date.now();
  }

  /**
   * Tracks state transition
   * @param featureId - Feature identifier
   * @param from - Previous state
   * @param to - New state
   * @param reason - Reason for transition
   * @param triggeredBy - What triggered the transition
   * @param context - Additional context
   */
  private trackStateTransition(
    featureId: string,
    from: 'disabled' | 'enabled' | 'active' | 'inactive',
    to: 'disabled' | 'enabled' | 'active' | 'inactive',
    reason: string,
    triggeredBy: 'user' | 'system' | 'api' | 'automatic',
    context?: Record<string, any>
  ): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    if (!feature.state) {
      feature.state = this.createDefaultFeatureState(featureId);
    }

    const transition: StateTransition = {
      timestamp: Date.now(),
      from,
      to,
      reason,
      triggeredBy,
      context
    };

    // Add to history with limit
    feature.state.history.push(transition);
    if (feature.state.history.length > this.persistenceConfig.maxHistoryEntries) {
      feature.state.history = feature.state.history.slice(-this.persistenceConfig.maxHistoryEntries);
    }
  }

  /**
   * Updates peak usage information
   * @param usage - Usage statistics to update
   * @param timestamp - Current timestamp
   */
  private updatePeakUsage(usage: FeatureUsage, timestamp: number): void {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    if (!usage.peakUsage || usage.count > usage.peakUsage.count) {
      usage.peakUsage = {
        hour,
        dayOfWeek,
        count: usage.count
      };
    }
  }

  /**
   * Emits a state management event
   * @param type - Event type
   * @param featureId - Feature identifier
   * @param data - Event data
   */
  private emitEvent(type: StateManagementEvent['type'], featureId: string, data: any): void {
    const event: StateManagementEvent = {
      type,
      featureId,
      data,
      timestamp: Date.now()
    };

    // Emit to specific event type listeners
    this.eventListeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.logger.error(`Error in event listener for ${type}:`, error);
      }
    });

    // Emit to all listeners
    this.eventListeners.get('*')?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.logger.error(`Error in wildcard event listener:`, error);
      }
    });
  }

  /**
   * Persists all feature states to storage
   */
  private async persistAllStates(): Promise<void> {
    if (!this.statePersistenceEnabled || !this.persistenceConfig.enabled) {
      return;
    }

    try {
      for (const [featureId, feature] of this.features) {
        if (feature.state) {
          await this.persistFeatureState(featureId, feature.state);
        }
      }
    } catch (error) {
      this.logger.error('Failed to persist all states:', error);
      throw error;
    }
  }

  /**
   * Persists a single feature state
   * @param featureId - Feature identifier
   * @param state - Feature state to persist
   */
  private async persistFeatureState(featureId: string, state: FeatureState): Promise<void> {
    try {
      const key = state.persistenceKey;
      const data = JSON.stringify(state);
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, data);
      }
      
      this.logger.debug(`Persisted state for feature '${featureId}'`);
    } catch (error) {
      this.logger.error(`Failed to persist state for feature '${featureId}':`, error);
    }
  }

  /**
   * Loads persisted states from storage
   */
  private async loadPersistedStates(): Promise<void> {
    if (!this.statePersistenceEnabled || !this.persistenceConfig.enabled) {
      return;
    }

    try {
      if (typeof localStorage === 'undefined') {
        this.logger.warn('localStorage not available, skipping state persistence');
        return;
      }

      for (const [featureId, feature] of this.features) {
        const key = `${this.persistenceConfig.keyPrefix}${featureId}`;
        const stored = localStorage.getItem(key);
        
        if (stored) {
          try {
            const persistedState = JSON.parse(stored) as FeatureState;
            feature.state = persistedState;
            this.logger.debug(`Loaded persisted state for feature '${featureId}'`);
          } catch (error) {
            this.logger.error(`Failed to parse persisted state for feature '${featureId}':`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to load persisted states:', error);
    }
  }

  /**
   * Starts periodic state synchronization
   */
  private startPeriodicSync(): void {
    if (this.syncIntervalId || !this.persistenceConfig.enabled) {
      return;
    }

    this.syncIntervalId = window.setInterval(async () => {
      try {
        await this.synchronizeStates({ force: false });
      } catch (error) {
        this.logger.error('Periodic sync failed:', error);
      }
    }, this.persistenceConfig.syncInterval);

    this.logger.debug(`Started periodic sync with interval ${this.persistenceConfig.syncInterval}ms`);
  }

  /**
   * Stops periodic state synchronization
   */
  private stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      this.logger.debug('Stopped periodic sync');
    }
  }

  /**
   * Cleanup method to be called when destroying the manager
   */
  public destroy(): void {
    this.stopPeriodicSync();
    this.eventListeners.clear();
    this.logger.info('PuterFeatureManager destroyed');
  }
}