/**
 * PuterDeploymentService - Handles deployment logic for Puter Cloud
 * Manages deployment operations, status tracking, and error handling
 */

export interface DeploymentConfig {
  /** Project name for deployment */
  projectName: string;
  /** Source directory to deploy */
  sourceDir?: string;
  /** Build command to run before deployment */
  buildCommand?: string;
  /** Environment variables */
  envVars?: Record<string, string>;
  /** Custom deployment options */
  options?: Record<string, any>;
}

export interface DeploymentStatus {
  /** Deployment ID */
  id: string;
  /** Current status of deployment */
  status: 'pending' | 'building' | 'deploying' | 'success' | 'error' | 'cancelled';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step being performed */
  currentStep: string;
  /** Deployment URL if successful */
  url?: string;
  /** Error message if failed */
  error?: string;
  /** Start timestamp */
  startedAt: number;
  /** End timestamp */
  completedAt?: number;
  /** Deployment logs */
  logs: DeploymentLog[];
  /** Metadata */
  metadata?: Record<string, any>;
}

export interface DeploymentLog {
  /** Timestamp of log entry */
  timestamp: number;
  /** Log level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
  /** Additional data */
  data?: any;
}

export interface DeploymentOptions {
  /** Callback for status updates */
  onStatusUpdate?: (status: DeploymentStatus) => void;
  /** Callback for log updates */
  onLogUpdate?: (log: DeploymentLog) => void;
  /** Timeout for deployment in milliseconds */
  timeout?: number;
  /** Whether to auto-retry on failure */
  autoRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
}

export interface DeploymentResult {
  /** Whether deployment was successful */
  success: boolean;
  /** Deployment ID */
  id?: string;
  /** Deployment URL */
  url?: string;
  /** Error message if failed */
  error?: string;
  /** Final status */
  status: DeploymentStatus;
}

export class PuterDeploymentService {
  private activeDeployments: Map<string, DeploymentStatus> = new Map();
  private deploymentHistory: DeploymentStatus[] = [];
  private logger: Console = console;
  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();
  private statusCallbacks: Map<string, (status: DeploymentStatus) => void> = new Map();
  private logCallbacks: Map<string, (log: DeploymentLog) => void> = new Map();

  constructor() {
    this.loadDeploymentHistory();
  }

  /**
   * Deploys an application to Puter Cloud
   * @param config - Deployment configuration
   * @param options - Deployment options
   * @returns Promise that resolves with deployment result
   */
  async deploy(
    config: DeploymentConfig,
    options: DeploymentOptions = {}
  ): Promise<DeploymentResult> {
    const deploymentId = this.generateDeploymentId();
    const status: DeploymentStatus = {
      id: deploymentId,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing deployment',
      startedAt: Date.now(),
      logs: []
    };

    try {
      this.logger.info(`Starting deployment for project: ${config.projectName}`);
      
      // Store callbacks
      if (options.onStatusUpdate) {
        this.statusCallbacks.set(deploymentId, options.onStatusUpdate);
      }
      if (options.onLogUpdate) {
        this.logCallbacks.set(deploymentId, options.onLogUpdate);
      }
      
      // Create initial deployment status
      this.activeDeployments.set(deploymentId, status);
      this.emitEvent('deployment-started', { id: deploymentId, config, status });

      // Validate Puter environment
      await this.validatePuterEnvironment();

      // Update status to building
      this.updateStatus(status, {
        status: 'building',
        currentStep: 'Building application',
        progress: 10
      });

      // Build application if needed
      if (config.buildCommand) {
        await this.buildApplication(config.buildCommand, status, options);
      }

      // Update status to deploying
      this.updateStatus(status, {
        status: 'deploying',
        currentStep: 'Deploying to Puter Cloud',
        progress: 70
      });

      // Perform actual deployment
      const deploymentUrl = await this.performDeployment(config, status, options);

      // Complete deployment successfully
      this.updateStatus(status, {
        status: 'success',
        currentStep: 'Deployment completed successfully',
        progress: 100,
        url: deploymentUrl,
        completedAt: Date.now()
      });

      this.addLog(status, 'info', 'Deployment completed successfully', { url: deploymentUrl });
      
      // Move to history
      this.moveToHistory(deploymentId);
      
      this.emitEvent('deployment-success', { id: deploymentId, url: deploymentUrl, status });
      
      return {
        success: true,
        id: deploymentId,
        url: deploymentUrl,
        status
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
      
      this.updateStatus(status, {
        status: 'error',
        currentStep: 'Deployment failed',
        error: errorMessage,
        completedAt: Date.now()
      });

      this.addLog(status, 'error', 'Deployment failed', { error: errorMessage });
      
      this.logger.error(`Deployment failed for ${config.projectName}:`, error);
      
      this.emitEvent('deployment-error', { id: deploymentId, error: errorMessage, status });
      
      // Move to history
      this.moveToHistory(deploymentId);
      
      return {
        success: false,
        id: deploymentId,
        error: errorMessage,
        status
      };
    } finally {
      // Clean up callbacks and active deployment
      this.statusCallbacks.delete(deploymentId);
      this.logCallbacks.delete(deploymentId);
      this.activeDeployments.delete(deploymentId);
    }
  }

  /**
   * Cancels an active deployment
   * @param deploymentId - Deployment ID to cancel
   * @returns Promise that resolves when cancellation is complete
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    const status = this.activeDeployments.get(deploymentId);
    if (!status) {
      throw new Error(`Deployment ${deploymentId} not found or not active`);
    }

    if (status.status === 'success' || status.status === 'error' || status.status === 'cancelled') {
      throw new Error(`Cannot cancel deployment in status: ${status.status}`);
    }

    this.updateStatus(status, {
      status: 'cancelled',
      currentStep: 'Deployment cancelled by user',
      completedAt: Date.now()
    });

    this.addLog(status, 'info', 'Deployment cancelled by user');
    
    this.emitEvent('deployment-cancelled', { id: deploymentId, status });
    
    this.logger.info(`Deployment ${deploymentId} cancelled`);
  }

  /**
   * Gets the current status of a deployment
   * @param deploymentId - Deployment ID
   * @returns Deployment status or null if not found
   */
  getDeploymentStatus(deploymentId: string): DeploymentStatus | null {
    return this.activeDeployments.get(deploymentId) || 
           this.deploymentHistory.find(d => d.id === deploymentId) || 
           null;
  }

  /**
   * Gets all active deployments
   * @returns Array of active deployment statuses
   */
  getActiveDeployments(): DeploymentStatus[] {
    return Array.from(this.activeDeployments.values());
  }

  /**
   * Gets deployment history
   * @param limit - Maximum number of entries to return
   * @returns Array of historical deployments
   */
  getDeploymentHistory(limit: number = 10): DeploymentStatus[] {
    return this.deploymentHistory
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /**
   * Sets up event listeners for deployment events
   * @param eventType - Type of event to listen for
   * @param listener - Event listener function
   * @returns Function to remove the listener
   */
  onDeploymentEvent(
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
   * Sets a custom logger for the service
   * @param logger - Logger instance to use
   */
  setLogger(logger: Console): void {
    this.logger = logger;
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.activeDeployments.clear();
    this.eventListeners.clear();
    this.statusCallbacks.clear();
    this.logCallbacks.clear();
    this.logger.info('PuterDeploymentService destroyed');
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  private generateDeploymentId(): string {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validatePuterEnvironment(): Promise<void> {
    try {
      // Check if Puter environment is available
      const puter = (globalThis as any).puter;
      if (!puter) {
        throw new Error('Puter environment not available');
      }

      // Check if hosting API is available
      if (!puter.hosting) {
        throw new Error('Puter hosting API not available');
      }

      // Check if user is authenticated
      if (puter.auth && !puter.auth.isSignedIn()) {
        throw new Error('Authentication required for deployment');
      }

      this.logger.debug('Puter environment validation passed');
    } catch (error) {
      throw new Error(`Puter environment validation failed: ${error}`);
    }
  }

  private async buildApplication(
    buildCommand: string,
    status: DeploymentStatus,
    options: DeploymentOptions
  ): Promise<void> {
    try {
      this.addLog(status, 'info', `Running build command: ${buildCommand}`);
      
      // Simulate build process (in real implementation, this would execute the build)
      this.updateStatus(status, { progress: 30 });
      await this.delay(1000);
      
      this.addLog(status, 'info', 'Build completed successfully');
      this.updateStatus(status, { progress: 50 });
      
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }

  private async performDeployment(
    config: DeploymentConfig,
    status: DeploymentStatus,
    options: DeploymentOptions
  ): Promise<string> {
    try {
      const puter = (globalThis as any).puter;
      
      this.addLog(status, 'info', 'Connecting to Puter Cloud...');
      this.updateStatus(status, { progress: 80 });
      
      // Simulate deployment process
      // In a real implementation, this would use:
      // - puter.hosting.deploy() or similar API
      // - File upload operations
      // - Environment setup
      // - Domain configuration
      
      await this.delay(2000);
      
      this.addLog(status, 'info', 'Uploading application files...');
      await this.delay(1500);
      
      this.addLog(status, 'info', 'Configuring environment...');
      await this.delay(1000);
      
      this.addLog(status, 'info', 'Starting application...');
      await this.delay(1000);
      
      // Generate a mock deployment URL
      const deploymentUrl = `https://${config.projectName}.puter.app`;
      
      return deploymentUrl;
      
    } catch (error) {
      throw new Error(`Deployment failed: ${error}`);
    }
  }

  private updateStatus(status: DeploymentStatus, updates: Partial<DeploymentStatus>): void {
    Object.assign(status, updates);
    
    // Notify listeners
    this.emitEvent('status-update', { id: status.id, status });
    
    // Trigger callback if provided
    const callback = this.statusCallbacks.get(status.id);
    if (callback) {
      callback(status);
    }
  }

  private addLog(status: DeploymentStatus, level: DeploymentLog['level'], message: string, data?: any): void {
    const log: DeploymentLog = {
      timestamp: Date.now(),
      level,
      message,
      data
    };
    
    status.logs.push(log);
    
    // Keep only last 100 logs to prevent memory issues
    if (status.logs.length > 100) {
      status.logs = status.logs.slice(-100);
    }
    
    // Notify listeners
    this.emitEvent('log-update', { id: status.id, log });
    
    // Trigger callback if provided
    const callback = this.logCallbacks.get(status.id);
    if (callback) {
      callback(log);
    }
  }

  private moveToHistory(deploymentId: string): void {
    const status = this.activeDeployments.get(deploymentId);
    if (status) {
      this.deploymentHistory.push(status);
      
      // Keep only last 50 deployments in history
      if (this.deploymentHistory.length > 50) {
        this.deploymentHistory = this.deploymentHistory.slice(-50);
      }
      
      this.saveDeploymentHistory();
    }
  }

  private emitEvent(eventType: string, data: any): void {
    // Emit to specific event type listeners
    this.eventListeners.get(eventType)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        this.logger.error(`Error in deployment event listener for ${eventType}:`, error);
      }
    });

    // Emit to wildcard listeners
    this.eventListeners.get('*')?.forEach(listener => {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        this.logger.error(`Error in wildcard deployment event listener:`, error);
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private saveDeploymentHistory(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const historyData = JSON.stringify(this.deploymentHistory);
        localStorage.setItem('puter-deployment-history', historyData);
      }
    } catch (error) {
      this.logger.warn('Failed to save deployment history:', error);
    }
  }

  private loadDeploymentHistory(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const historyData = localStorage.getItem('puter-deployment-history');
        if (historyData) {
          this.deploymentHistory = JSON.parse(historyData);
          this.logger.debug(`Loaded ${this.deploymentHistory.length} historical deployments`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load deployment history:', error);
    }
  }
}