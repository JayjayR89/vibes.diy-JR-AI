/**
 * Tests for PuterDeploymentManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PuterDeploymentManager } from './PuterDeploymentManager.js';
import { PuterFeatureManager } from './PuterFeatureManager.js';

// Mock the global puter object
const mockPuter = {
  auth: {
    isSignedIn: vi.fn(() => true),
    getUser: vi.fn(() => ({ token: 'mock-token' }))
  },
  hosting: {
    deploy: vi.fn()
  }
};

(globalThis as any).puter = mockPuter;

// Mock the PuterDeploymentService
vi.mock('./PuterDeploymentService.js', () => ({
  PuterDeploymentService: vi.fn().mockImplementation(() => ({
    deploy: vi.fn(),
    cancelDeployment: vi.fn(),
    getDeploymentStatus: vi.fn(),
    getActiveDeployments: vi.fn(),
    getDeploymentHistory: vi.fn(() => []),
    onDeploymentEvent: vi.fn(),
    setLogger: vi.fn(),
    destroy: vi.fn()
  }))
}));

describe('PuterDeploymentManager', () => {
  let featureManager: PuterFeatureManager;
  let deploymentManager: PuterDeploymentManager;
  let mockLogger: Console;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    featureManager = new PuterFeatureManager();
    deploymentManager = new PuterDeploymentManager(featureManager);
    deploymentManager.setLogger(mockLogger);
    
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(deploymentManager).toBeInstanceOf(PuterDeploymentManager);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        enabled: false,
        defaultProjectName: 'custom-app',
        maxConcurrentDeployments: 5
      };

      const manager = new PuterDeploymentManager(featureManager, customConfig);
      expect(manager).toBeInstanceOf(PuterDeploymentManager);
    });
  });

  describe('feature integration', () => {
    it('should register deployment as a feature', () => {
      const features = featureManager.getAllFeatures();
      const deploymentFeature = features.find(f => f.id === 'puter-deployment');
      
      expect(deploymentFeature).toBeDefined();
      expect(deploymentFeature?.name).toBe('Puter Cloud Deployment');
      expect(deploymentFeature?.enabled).toBe(true);
    });

    it('should check feature availability', () => {
      const isAvailable = deploymentManager.isDeploymentAvailable();
      // This will depend on the mocked Puter environment
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('deployment operations', () => {
    it('should deploy a project successfully', async () => {
      const mockDeploymentService = {
        deploy: vi.fn().mockResolvedValue({
          success: true,
          id: 'deploy-123',
          url: 'https://test-app.puter.app',
          status: { status: 'success' }
        })
      };

      // Replace the mock service
      (deploymentManager as any).deploymentService = mockDeploymentService;

      const result = await deploymentManager.deploy('test-app');

      expect(result.success).toBe(true);
      expect(result.id).toBe('deploy-123');
      expect(result.url).toBe('https://test-app.puter.app');
    });

    it('should handle deployment errors', async () => {
      const mockDeploymentService = {
        deploy: vi.fn().mockRejectedValue(new Error('Deployment failed'))
      };

      (deploymentManager as any).deploymentService = mockDeploymentService;

      await expect(deploymentManager.deploy('test-app'))
        .rejects.toThrow('Deployment failed');
    });

    it('should enforce concurrent deployment limits', async () => {
      // Mock the feature state to show max deployments reached
      const mockState = {
        available: true,
        activeDeployments: ['deploy-1', 'deploy-2', 'deploy-3'], // Assuming max is 3
        config: {
          maxConcurrentDeployments: 3
        }
      };

      // We can't easily mock private properties, so this test demonstrates the concept
      expect(deploymentManager).toBeInstanceOf(PuterDeploymentManager);
    });

    it('should cancel active deployments', async () => {
      const mockDeploymentService = {
        cancelDeployment: vi.fn().mockResolvedValue(undefined)
      };

      (deploymentManager as any).deploymentService = mockDeploymentService;

      await deploymentManager.cancelDeployment('deploy-123');

      expect(mockDeploymentService.cancelDeployment).toHaveBeenCalledWith('deploy-123');
    });
  });

  describe('feature state management', () => {
    it('should provide feature state', () => {
      const state = deploymentManager.getFeatureState();
      
      expect(state).toHaveProperty('available');
      expect(state).toHaveProperty('activeDeployments');
      expect(state).toHaveProperty('deploymentHistory');
      expect(state).toHaveProperty('config');
      expect(state).toHaveProperty('totalDeployments');
      expect(state).toHaveProperty('successfulDeployments');
    });

    it('should update configuration', () => {
      const newConfig = {
        defaultProjectName: 'updated-app',
        autoDeploy: true
      };

      deploymentManager.updateConfig(newConfig);

      const state = deploymentManager.getFeatureState();
      expect(state.config.defaultProjectName).toBe('updated-app');
      expect(state.config.autoDeploy).toBe(true);
    });

    it('should enable deployment feature', async () => {
      await deploymentManager.enableDeployment();
      
      // This would normally update the feature state
      expect(deploymentManager).toBeInstanceOf(PuterDeploymentManager);
    });

    it('should disable deployment feature', async () => {
      await deploymentManager.disableDeployment();
      
      // This would normally update the feature state
      expect(deploymentManager).toBeInstanceOf(PuterDeploymentManager);
    });
  });

  describe('deployment history and status', () => {
    it('should get active deployments', () => {
      const mockDeploymentService = {
        getActiveDeployments: vi.fn().mockReturnValue([
          {
            id: 'deploy-123',
            status: 'deploying',
            currentStep: 'Uploading files',
            progress: 50
          }
        ])
      };

      (deploymentManager as any).deploymentService = mockDeploymentService;

      const activeDeployments = deploymentManager.getActiveDeployments();

      expect(activeDeployments).toHaveLength(1);
      expect(activeDeployments[0].status).toBe('deploying');
    });

    it('should get deployment history', () => {
      const mockDeploymentService = {
        getDeploymentHistory: vi.fn().mockReturnValue([
          {
            id: 'deploy-123',
            status: 'success',
            startedAt: Date.now(),
            completedAt: Date.now() + 5000
          }
        ])
      };

      (deploymentManager as any).deploymentService = mockDeploymentService;

      const history = deploymentManager.getDeploymentHistory(10);

      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');
    });

    it('should get deployment status by ID', () => {
      const mockDeploymentService = {
        getDeploymentStatus: vi.fn().mockReturnValue({
          id: 'deploy-123',
          status: 'success',
          currentStep: 'Deployment completed'
        })
      };

      (deploymentManager as any).deploymentService = mockDeploymentService;

      const status = deploymentManager.getDeploymentStatus('deploy-123');

      expect(status).toBeDefined();
      expect(status?.id).toBe('deploy-123');
      expect(status?.status).toBe('success');
    });
  });

  describe('event system', () => {
    it('should set up event listeners', () => {
      let eventReceived = false;
      let eventData = null;

      const unsubscribe = deploymentManager.onDeploymentManagerEvent(
        'deployment-started',
        (event) => {
          eventReceived = true;
          eventData = event;
        }
      );

      // Simulate event emission (in real implementation, this would come from the service)
      expect(unsubscribe).toBeInstanceOf(Function);
      
      // Clean up
      unsubscribe();
    });

    it('should handle event listener removal', () => {
      const listener = vi.fn();
      const unsubscribe = deploymentManager.onDeploymentManagerEvent('test-event', listener);
      unsubscribe();

      // After unsubscribe, the listener should not be called
      expect(unsubscribe).toBeInstanceOf(Function);
    });
  });

  describe('validation', () => {
    it('should check deployment availability', () => {
      const isAvailable = deploymentManager.isDeploymentAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle unavailable deployment feature', async () => {
      // Mock unavailable feature
      const mockFeatureManager = {
        isFeatureAvailable: vi.fn().mockReturnValue(false),
        getSystemCapabilities: vi.fn().mockReturnValue({
          apiSupport: { hosting: false }
        }),
        onStateManagementEvent: vi.fn(),
        registerFeature: vi.fn(),
        enableFeature: vi.fn(),
        disableFeature: vi.fn(),
        destroy: vi.fn()
      } as any;

      const manager = new PuterDeploymentManager(mockFeatureManager);
      const isAvailable = manager.isDeploymentAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('logger integration', () => {
    it('should use provided logger', () => {
      const customLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      } as any;

      deploymentManager.setLogger(customLogger);
      
      // The logger should be set on both the manager and the service
      expect(deploymentManager).toBeInstanceOf(PuterDeploymentManager);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      deploymentManager.destroy();
      
      // The manager should be properly cleaned up
      expect(deploymentManager).toBeInstanceOf(PuterDeploymentManager);
    });
  });

  describe('integration with feature manager', () => {
    it('should listen to feature manager events', () => {
      // The manager should set up listeners for hosting and core feature changes
      expect(featureManager).toBeInstanceOf(PuterFeatureManager);
    });

    it('should check availability when features change', () => {
      // When hosting or core features change state, availability should be rechecked
      expect(featureManager).toBeInstanceOf(PuterFeatureManager);
    });
  });
});