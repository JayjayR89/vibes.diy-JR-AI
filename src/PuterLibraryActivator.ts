/**
 * PuterLibraryActivator - Integrates PuterFeatureManager with library activation system
 * Handles project-specific Puter library activation, state management, and UI coordination
 */

import { PuterFeatureManager } from './PuterFeatureManager.js';

export interface PuterLibraryConfig {
  /** Whether Puter library is enabled for this project */
  enabled: boolean;
  /** Project-specific features to activate */
  features: string[];
  /** Authentication requirements */
  requiresAuth: boolean;
  /** Auto-activation settings */
  autoActivate: boolean;
  /** Project metadata */
  metadata?: Record<string, any>;
}

export interface PuterActivationStatus {
  /** Current activation state */
  active: boolean;
  /** Available features */
  availableFeatures: string[];
  /** Enabled features */
  enabledFeatures: string[];
  /** Authentication status */
  authenticated: boolean;
  /** Library loading status */
  loaded: boolean;
  /** Error information if any */
  error?: string;
  /** Last activation timestamp */
  lastActivated?: number;
}

export interface PuterLibraryActivationOptions {
  /** Project ID for project-specific activation */
  projectId?: string;
  /** Features to activate */
  features?: string[];
  /** Auto-enable on activation */
  autoEnable?: boolean;
  /** Authentication callback */
  onAuthRequired?: () => Promise<string | null>;
  /** Success callback */
  onActivationSuccess?: (features: string[]) => void;
  /** Error callback */
  onActivationError?: (error: string) => void;
}

export class PuterLibraryActivator {
  private featureManager: PuterFeatureManager;
  private projectConfigs: Map<string, PuterLibraryConfig> = new Map();
  private activationStatus: PuterActivationStatus = {
    active: false,
    availableFeatures: [],
    enabledFeatures: [],
    authenticated: false,
    loaded: false
  };
  private logger: Console = console;

  /**
   * Constructor for PuterLibraryActivator
   * @param featureManager - The PuterFeatureManager instance to use
   * @param initialConfigs - Optional initial project configurations
   */
  constructor(
    featureManager: PuterFeatureManager,
    initialConfigs?: Map<string, PuterLibraryConfig>
  ) {
    this.featureManager = featureManager;
    
    if (initialConfigs) {
      this.projectConfigs = new Map(initialConfigs);
    }

    this.initializeEventListeners();
    this.logger.debug('PuterLibraryActivator initialized');
  }

  /**
   * Activates Puter library for a specific project
   * @param projectId - Unique project identifier
   * @param options - Activation options
   * @returns Promise that resolves when activation is complete
   */
  async activateLibrary(
    projectId: string,
    options: PuterLibraryActivationOptions = {}
  ): Promise<void> {
    try {
      this.logger.info(`Activating Puter library for project: ${projectId}`);

      // Get or create project configuration
      const config = this.getOrCreateProjectConfig(projectId, options);
      
      // Check authentication requirements
      if (config.requiresAuth && !this.activationStatus.authenticated) {
        const token = await this.handleAuthentication(options.onAuthRequired);
        if (!token) {
          throw new Error('Authentication required for Puter library activation');
        }
      }

      // Load Puter.js library if not already loaded
      await this.ensureLibraryLoaded();

      // Register Puter as a library feature
      await this.registerLibraryFeature(projectId, config);

      // Activate specified features
      if (config.features.length > 0) {
        await this.activateFeatures(config.features, options);
      }

      // Update activation status
      this.activationStatus = {
        ...this.activationStatus,
        active: true,
        lastActivated: Date.now(),
        error: undefined
      };

      // Set up project-specific configuration
      this.projectConfigs.set(projectId, config);

      // Notify success
      options.onActivationSuccess?.(config.features);

      this.logger.info(`Puter library activated successfully for project: ${projectId}`);
    } catch (error) {
      const errorMessage = `Failed to activate Puter library for project ${projectId}: ${error}`;
      this.logger.error(errorMessage);
      
      this.activationStatus.error = errorMessage;
      options.onActivationError?.(errorMessage);
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Deactivates Puter library for a specific project
   * @param projectId - Unique project identifier
   * @param options - Deactivation options
   */
  async deactivateLibrary(
    projectId: string,
    options: { onDeactivation?: () => void } = {}
  ): Promise<void> {
    try {
      this.logger.info(`Deactivating Puter library for project: ${projectId}`);

      const config = this.projectConfigs.get(projectId);
      if (!config) {
        this.logger.warn(`No configuration found for project: ${projectId}`);
        return;
      }

      // Disable all features for this project
      if (config.features.length > 0) {
        for (const featureId of config.features) {
          try {
            await this.featureManager.disableFeature(featureId, 'library-deactivation');
          } catch (error) {
            this.logger.warn(`Failed to disable feature ${featureId}:`, error);
          }
        }
      }

      // Update status
      this.activationStatus.enabledFeatures = [];
      
      // Remove project configuration
      this.projectConfigs.delete(projectId);

      options.onDeactivation?.();

      this.logger.info(`Puter library deactivated for project: ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate Puter library for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the current activation status
   * @returns Current activation status
   */
  getActivationStatus(): PuterActivationStatus {
    return { ...this.activationStatus };
  }

  /**
   * Gets project-specific configuration
   * @param projectId - Unique project identifier
   * @returns Project configuration or undefined
   */
  getProjectConfig(projectId: string): PuterLibraryConfig | undefined {
    return this.projectConfigs.get(projectId);
  }

  /**
   * Updates project-specific configuration
   * @param projectId - Unique project identifier
   * @param config - New configuration
   */
  updateProjectConfig(projectId: string, config: Partial<PuterLibraryConfig>): void {
    const currentConfig = this.projectConfigs.get(projectId);
    if (currentConfig) {
      const updatedConfig = { ...currentConfig, ...config };
      this.projectConfigs.set(projectId, updatedConfig);
      this.logger.debug(`Updated configuration for project: ${projectId}`);
    }
  }

  /**
   * Checks if Puter library is available in the current environment
   * @returns true if Puter library is available
   */
  isLibraryAvailable(): boolean {
    return this.featureManager.isFeatureAvailable('puter-core');
  }

  /**
   * Gets available Puter features for the current environment
   * @returns Array of available feature IDs
   */
  getAvailableFeatures(): string[] {
    const allFeatures = this.featureManager.getAllFeatures();
    return allFeatures
      .filter(feature => this.featureManager.isFeatureAvailable(feature.id))
      .map(feature => feature.id);
  }

  /**
   * Sets the logger for the activator
   * @param logger - Logger instance to use
   */
  setLogger(logger: Console): void {
    this.logger = logger;
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.featureManager.destroy();
    this.projectConfigs.clear();
    this.logger.info('PuterLibraryActivator destroyed');
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  private initializeEventListeners(): void {
    // Listen to feature manager events
    this.featureManager.onStateManagementEvent('state-change', (event) => {
      if (event.featureId.startsWith('puter-')) {
        this.updateEnabledFeatures();
      }
    });

    this.featureManager.onStateManagementEvent('initialization', (event) => {
      if (event.featureId.startsWith('puter-')) {
        this.updateEnabledFeatures();
      }
    });
  }

  private getOrCreateProjectConfig(
    projectId: string,
    options: PuterLibraryActivationOptions
  ): PuterLibraryConfig {
    const existing = this.projectConfigs.get(projectId);
    if (existing) {
      return existing;
    }

    return {
      enabled: true,
      features: options.features || ['puter-core'],
      requiresAuth: true,
      autoActivate: options.autoEnable ?? true,
      metadata: {
        projectId,
        createdAt: Date.now(),
        lastModified: Date.now()
      }
    };
  }

  private async handleAuthentication(
    onAuthRequired?: () => Promise<string | null>
  ): Promise<string | null> {
    if (onAuthRequired) {
      return await onAuthRequired();
    }

    // Try to get existing authentication token
    try {
      const puter = (globalThis as any).puter;
      if (puter?.auth?.isSignedIn()) {
        const user = puter.auth.getUser();
        if (user?.token) {
          return user.token;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get existing authentication:', error);
    }

    throw new Error('Authentication required but no auth handler provided');
  }

  private async ensureLibraryLoaded(): Promise<void> {
    if (this.activationStatus.loaded) {
      return;
    }

    try {
      // Check if Puter is already loaded
      const puter = (globalThis as any).puter;
      if (!puter) {
        // Load Puter.js dynamically
        await this.loadPuterScript();
      }

      this.activationStatus.loaded = true;
      this.logger.debug('Puter library loaded successfully');
    } catch (error) {
      throw new Error(`Failed to load Puter library: ${error}`);
    }
  }

  private async loadPuterScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/puter.js';
      script.onload = () => {
        this.logger.debug('Puter.js script loaded');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Puter.js script'));
      };
      document.head.appendChild(script);
    });
  }

  private async registerLibraryFeature(
    projectId: string,
    config: PuterLibraryConfig
  ): Promise<void> {
    // Register Puter as a library feature if not already registered
    const libraryFeature = {
      id: 'puter-library',
      name: 'Puter.js Library',
      description: 'Cloud services and AI integration library',
      enabled: config.enabled,
      dependencies: config.features,
      metadata: {
        projectId,
        libraryModule: '@heyputer/puter.js',
        importType: 'default',
        ...config.metadata
      }
    };

    this.featureManager.registerFeature(libraryFeature);
  }

  private async activateFeatures(
    features: string[],
    options: PuterLibraryActivationOptions
  ): Promise<void> {
    const availableFeatures = this.getAvailableFeatures();
    
    for (const featureId of features) {
      if (availableFeatures.includes(featureId)) {
        try {
          if (options.autoEnable !== false) {
            await this.featureManager.enableFeature(featureId, 'library-activation', {
              projectId: options.projectId,
              source: 'library-activator'
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to activate feature ${featureId}:`, error);
        }
      }
    }

    this.updateEnabledFeatures();
  }

  private updateEnabledFeatures(): void {
    const allFeatures = this.featureManager.getAllFeatures();
    const enabledFeatures = allFeatures
      .filter(feature => feature.enabled)
      .map(feature => feature.id);
    
    this.activationStatus.enabledFeatures = enabledFeatures;
  }
}