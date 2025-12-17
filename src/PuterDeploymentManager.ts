/**
 * PuterDeploymentManager - Integrates deployment functionality with PuterFeatureManager
 * Manages deployment operations as a Puter feature with comprehensive state management
 */

import { PuterFeatureManager } from './PuterFeatureManager.js';
import { 
  PuterDeploymentService, 
  DeploymentConfig, 
  DeploymentStatus, 
  DeploymentOptions, 
  DeploymentResult 
} from './PuterDeploymentService.js';

export interface DeploymentManagerConfig {
  /** Whether deployment feature is enabled */
  enabled: boolean;
  /** Default project name template */
  defaultProjectName?: string;
  /** Default build command */
  defaultBuildCommand?: string;
  /** Whether to auto-deploy on build */
  autoDeploy?: boolean;
  /** Maximum concurrent deployments */
  maxConcurrentDeployments?: number;
  /** Deployment timeout in milliseconds */
  deploymentTimeout?: number;
}

export interface DeploymentFeatureState {
  /** Whether deployment feature is available */
  available: boolean;
  /** Current active deployments */
  activeDeployments: string[];
  /** Deployment history */
  deploymentHistory: DeploymentStatus[];
  /** Feature configuration */
  config: DeploymentManagerConfig;
  /** Last deployment timestamp */
  lastDeployment?: number;
  /** Total deployments count */
  totalDeployments: number;
  /** Successful deployments count */
  successfulDeployments: number;
}

export class PuterDeploymentManager {
  private featureManager: PuterFeatureManager;
  private deploymentService: PuterDeploymentService;
  private config: DeploymentManagerConfig;
  private featureState: DeploymentFeatureState;
  private logger: Console = console;
  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(
    featureManager: PuterFeatureManager,
    config: Partial<DeploymentManagerConfig> = {}
  ) {
    this.featureManager = featureManager;
    this.deploymentService = new PuterDeploymentService();
    
    // Set default configuration
    this.config = {
      enabled: true,
      defaultProjectName: 'my-app',
      defaultBuildCommand: 'npm run build',
      autoDeploy: false,
      maxConcurrentDeployments: 3,
      deploymentTimeout: 300000, // 5 minutes
      ...config
    };

    // Initialize feature state
    this.featureState = {
      available: false,
      activeDeployments: [],
      deploymentHistory: [],
      config: this.config,
      totalDeployments: 0,
      successfulDeployments: 0
    };

    this.initializeDeploymentFeature();
  }

  /**
   * Initializes the deployment feature in the PuterFeatureManager
   */
  private initializeDeploymentFeature(): void {
    try {
      // Register deployment as a feature
      const deploymentFeature = {
        id: 'puter-deployment',
        name: 'Puter Cloud Deployment',
        description: 'Deploy applications to Puter Cloud with automatic build and hosting',
        enabled: this.config.enabled,
        version: '1.0.0',
        dependencies: ['puter-core', 'hosting'],
        metadata: {
          category: 'hosting',
          supportsAutoDeploy: true,
          supportsCustomDomains: true,
          supportsEnvironmentVars: true
        }
      };

      this.featureManager.registerFeature(deploymentFeature);
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Check availability
      this.checkFeatureAvailability();
      
      this.logger.info('PuterDeploymentManager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize PuterDeploymentManager:', error);
    }
  }

  /**
   * Checks if the deployment feature is available
   */
  private checkFeatureAvailability(): void {
    try {
      // Check if Puter hosting is available
      const hostingAvailable = this.featureManager.isFeatureAvailable('hosting');
      
      // Check system capabilities
      const capabilities = this.featureManager.getSystemCapabilities();
      const hostingSupported = capabilities?.apiSupport.hosting || false;
      
      this.featureState.available = hostingAvailable && hostingSupported;
      
      if (this.featureState.available) {
        this.logger.info('Deployment feature is available');
      } else {
        this.logger.warn('Deployment feature is not available in current environment');
      }
    } catch (error) {
      this.logger.error('Error checking deployment feature availability:', error);
      this.featureState.available = false;
    }
  }

  /**
   * Sets up event listeners for deployment and feature events
   */
  private setupEventListeners(): void {
    // Listen to deployment service events
    this.deploymentService.onDeploymentEvent('deployment-started', (event) => {
      this.handleDeploymentStarted(event);
    });

    this.deploymentService.onDeploymentEvent('deployment-success', (event) => {
      this.handleDeploymentSuccess(event);
    });

    this.deploymentService.onDeploymentEvent('deployment-error', (event) => {
      this.handleDeploymentError(event);
    });

    this.deploymentService.onDeploymentEvent('deployment-cancelled', (event) => {
      this.handleDeploymentCancelled(event);
    });

    this.deploymentService.onDeploymentEvent('status-update', (event) => {
      this.handleStatusUpdate(event);
    });

    // Listen to feature manager events
    this.featureManager.onStateManagementEvent('state-change', (event) => {
      if (event.featureId === 'hosting' || event.featureId === 'puter-core') {
        this.checkFeatureAvailability();
      }
    });
  }

  /**
   * Deploys an application to Puter Cloud
   * @param projectName - Name of the project to deploy
   * @param options - Deployment options
   * @returns Promise that resolves with deployment result
   */
  async deploy(
    projectName: string,
    options: DeploymentOptions & { 
      buildCommand?: string;
      sourceDir?: string;
      envVars?: Record<string, string>;
    } = {}
  ): Promise<DeploymentResult> {
    if (!this.featureState.available) {
      throw new Error('Deployment feature is not available');
    }

    if (this.featureState.activeDeployments.length >= this.config.maxConcurrentDeployments!) {
      throw new Error(`Maximum concurrent deployments reached (${this.config.maxConcurrentDeployments})`);
    }

    const config: DeploymentConfig = {
      projectName: projectName || this.config.defaultProjectName!,
      buildCommand: options.buildCommand || this.config.defaultBuildCommand,
      sourceDir: options.sourceDir,
      envVars: options.envVars,
      options: options.options
    };

    try {
      this.logger.info(`Starting deployment for project: ${config.projectName}`);
      
      const result = await this.deploymentService.deploy(config, {
        ...options,
        timeout: options.timeout || this.config.deploymentTimeout
      });

      return result;
    } catch (error) {
      this.logger.error(`Deployment failed for project ${config.projectName}:`, error);
      throw error;
    }
  }

  /**
   * Cancels an active deployment
   * @param deploymentId - Deployment ID to cancel
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    await this.deploymentService.cancelDeployment(deploymentId);
  }

  /**
   * Gets the current deployment feature state
   * @returns Current feature state
   */
  getFeatureState(): DeploymentFeatureState {
    return { ...this.featureState };
  }

  /**
   * Gets active deployments
   * @returns Array of active deployment statuses
   */
  getActiveDeployments(): DeploymentStatus[] {
    return this.deploymentService.getActiveDeployments();
  }

  /**
   * Gets deployment history
   * @param limit - Maximum number of entries
   * @returns Array of historical deployments
   */
  getDeploymentHistory(limit: number = 10): DeploymentStatus[] {
    return this.deploymentService.getDeploymentHistory(limit);
  }

  /**
   * Gets deployment status by ID
   * @param deploymentId - Deployment ID
   * @returns Deployment status or null
   */
  getDeploymentStatus(deploymentId: string): DeploymentStatus | null {
    return this.deploymentService.getDeploymentStatus(deploymentId);
  }

  /**
   * Checks if deployment feature is available
   * @returns true if deployment is available
   */
  isDeploymentAvailable(): boolean {
    return this.featureState.available;
  }

  /**
   * Updates deployment feature configuration
   * @param newConfig - New configuration options
   */
  updateConfig(newConfig: Partial<DeploymentManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.featureState.config = this.config;
    
    this.logger.info('Deployment configuration updated');
    this.emitEvent('config-updated', { config: this.config });
  }

  /**
   * Enables the deployment feature
   */
  async enableDeployment(): Promise<void> {
    try {
      await this.featureManager.enableFeature('puter-deployment', 'manual-enable');
      this.checkFeatureAvailability();
      this.logger.info('Deployment feature enabled');
    } catch (error) {
      this.logger.error('Failed to enable deployment feature:', error);
      throw error;
    }
  }

  /**
   * Disables the deployment feature
   */
  async disableDeployment(): Promise<void> {
    try {
      await this.featureManager.disableFeature('puter-deployment', 'manual-disable');
      this.logger.info('Deployment feature disabled');
    } catch (error) {
      this.logger.error('Failed to disable deployment feature:', error);
      throw error;
    }
  }

  /**
   * Sets up event listeners for deployment manager events
   * @param eventType - Type of event to listen for
   * @param listener - Event listener function
   * @returns Function to remove the listener
   */
  onDeploymentManagerEvent(
    eventType: string,
    listener: (event: any) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(listener);
    
    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Sets a custom logger for the manager
   * @param logger - Logger instance to use
   */
  setLogger(logger: Console): void {
    this.logger = logger;
    this.deploymentService.setLogger(logger);
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.eventListeners.clear();
    this.deploymentService.destroy();
    this.featureManager.destroy();
    this.logger.info('PuterDeploymentManager destroyed');
  }

  // =============================================
  // PRIVATE EVENT HANDLERS
  // =============================================

  private handleDeploymentStarted(event: any): void {
    const { id } = event;
    
    // Add to active deployments
    if (!this.featureState.activeDeployments.includes(id)) {
      this.featureState.activeDeployments.push(id);
    }
    
    // Update feature state
    this.featureState.totalDeployments++;
    this.featureState.lastDeployment = Date.now();
    
    this.emitEvent('deployment-started', event);
  }

  private handleDeploymentSuccess(event: any): void {
    const { id } = event;
    
    // Remove from active deployments
    this.featureState.activeDeployments = this.featureState.activeDeployments.filter(
      deploymentId => deploymentId !== id
    );
    
    // Update success count
    this.featureState.successfulDeployments++;
    
    // Update history
    this.updateDeploymentHistory();
    
    this.emitEvent('deployment-success', event);
  }

  private handleDeploymentError(event: any): void {
    const { id } = event;
    
    // Remove from active deployments
    this.featureState.activeDeployments = this.featureState.activeDeployments.filter(
      deploymentId => deploymentId !== id
    );
    
    // Update history
    this.updateDeploymentHistory();
    
    this.emitEvent('deployment-error', event);
  }

  private handleDeploymentCancelled(event: any): void {
    const { id } = event;
    
    // Remove from active deployments
    this.featureState.activeDeployments = this.featureState.activeDeployments.filter(
      deploymentId => deploymentId !== id
    );
    
    // Update history
    this.updateDeploymentHistory();
    
    this.emitEvent('deployment-cancelled', event);
  }

  private handleStatusUpdate(event: any): void {
    this.emitEvent('status-update', event);
  }

  private updateDeploymentHistory(): void {
    this.featureState.deploymentHistory = this.getDeploymentHistory();
  }

  private emitEvent(eventType: string, data: any): void {
    // Emit to specific event type listeners
    this.eventListeners.get(eventType)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        this.logger.error(`Error in deployment manager event listener for ${eventType}:`, error);
      }
    });

    // Emit to wildcard listeners
    this.eventListeners.get('*')?.forEach(listener => {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        this.logger.error(`Error in wildcard deployment manager event listener:`, error);
      }
    });
  }
}