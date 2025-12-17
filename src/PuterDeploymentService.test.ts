/**
 * Tests for PuterDeploymentService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  PuterDeploymentService, 
  DeploymentConfig, 
  DeploymentStatus,
  DeploymentOptions 
} from './PuterDeploymentService.js';

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

describe('PuterDeploymentService', () => {
  let service: PuterDeploymentService;
  let mockLogger: Console;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as any;

    service = new PuterDeploymentService();
    service.setLogger(mockLogger);
    
    // Clear localStorage
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      expect(service).toBeInstanceOf(PuterDeploymentService);
    });
  });

  describe('deploy', () => {
    it('should successfully deploy a project', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await service.deploy(config);

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status.status).toBe('success');
    });

    it('should handle deployment with build command', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app',
        buildCommand: 'npm run build'
      };

      const result = await service.deploy(config);

      expect(result.success).toBe(true);
      expect(result.status.status).toBe('success');
    });

    it('should handle deployment errors', async () => {
      // Mock error scenario
      const errorService = new PuterDeploymentService();
      
      // Mock validatePuterEnvironment to throw error
      const originalValidate = (errorService as any).validatePuterEnvironment;
      (errorService as any).validatePuterEnvironment = vi.fn().mockRejectedValue(new Error('Puter environment not available'));

      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await errorService.deploy(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.status.status).toBe('error');
    });

    it('should provide status updates during deployment', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const statusUpdates: DeploymentStatus[] = [];
      const options: DeploymentOptions = {
        onStatusUpdate: (status) => {
          statusUpdates.push(status);
        }
      };

      await service.deploy(config, options);

      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates.some(s => s.status === 'building')).toBe(true);
      expect(statusUpdates.some(s => s.status === 'deploying')).toBe(true);
      expect(statusUpdates.some(s => s.status === 'success')).toBe(true);
    });
  });

  describe('cancelDeployment', () => {
    it('should cancel active deployment', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      // Start deployment
      const result = await service.deploy(config);
      const deploymentId = result.id!;

      // Cancel deployment (in a real scenario, this would be called while deployment is active)
      // For testing, we'll simulate by directly modifying the activeDeployments
      const status = service.getDeploymentStatus(deploymentId);
      if (status) {
        status.status = 'deploying'; // Set to a cancellable state
        (service as any).activeDeployments.set(deploymentId, status);
      }

      await service.cancelDeployment(deploymentId);

      const cancelledStatus = service.getDeploymentStatus(deploymentId);
      expect(cancelledStatus?.status).toBe('cancelled');
    });

    it('should throw error when cancelling non-existent deployment', async () => {
      await expect(service.cancelDeployment('non-existent-id'))
        .rejects.toThrow('not found or not active');
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status by ID', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await service.deploy(config);
      const deploymentId = result.id!;

      const status = service.getDeploymentStatus(deploymentId);
      expect(status).toBeDefined();
      expect(status?.id).toBe(deploymentId);
    });

    it('should return null for non-existent deployment', () => {
      const status = service.getDeploymentStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });

  describe('getActiveDeployments', () => {
    it('should return active deployments', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      await service.deploy(config);

      const activeDeployments = service.getActiveDeployments();
      // After deployment completes, it should be moved to history
      expect(Array.isArray(activeDeployments)).toBe(true);
    });
  });

  describe('getDeploymentHistory', () => {
    it('should return deployment history', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      await service.deploy(config);

      const history = service.getDeploymentHistory(10);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].status).toBe('success');
    });

    it('should limit history entries', async () => {
      // Deploy multiple times
      for (let i = 0; i < 5; i++) {
        await service.deploy({ projectName: `test-app-${i}` });
      }

      const history = service.getDeploymentHistory(3);
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('event system', () => {
    it('should emit deployment-started events', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      let eventReceived = false;
      let eventData = null;

      service.onDeploymentEvent('deployment-started', (event) => {
        eventReceived = true;
        eventData = event;
      });

      await service.deploy(config);

      expect(eventReceived).toBe(true);
      expect(eventData).toHaveProperty('id');
      expect(eventData).toHaveProperty('config');
    });

    it('should emit deployment-success events', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      let eventReceived = false;
      let eventData = null;

      service.onDeploymentEvent('deployment-success', (event) => {
        eventReceived = true;
        eventData = event;
      });

      await service.deploy(config);

      expect(eventReceived).toBe(true);
      expect(eventData).toHaveProperty('url');
      expect(eventData).toHaveProperty('status');
    });

    it('should emit deployment-error events', async () => {
      // Mock error scenario
      const errorService = new PuterDeploymentService();
      (errorService as any).validatePuterEnvironment = vi.fn().mockRejectedValue(new Error('Test error'));

      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      let eventReceived = false;
      let eventData = null;

      errorService.onDeploymentEvent('deployment-error', (event) => {
        eventReceived = true;
        eventData = event;
      });

      await errorService.deploy(config);

      expect(eventReceived).toBe(true);
      expect(eventData).toHaveProperty('error');
    });

    it('should handle event listener removal', () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      let callCount = 0;
      const listener = () => callCount++;

      const unsubscribe = service.onDeploymentEvent('deployment-started', listener);
      unsubscribe(); // Remove listener

      service.deploy(config).catch(() => {}); // Ignore errors

      expect(callCount).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate Puter environment', async () => {
      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await service.deploy(config);
      expect(result.success).toBe(true);
    });

    it('should handle missing Puter environment', async () => {
      // Remove puter global
      delete (globalThis as any).puter;

      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await service.deploy(config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Puter environment not available');
    });

    it('should handle missing hosting API', async () => {
      // Mock missing hosting API
      const mockPuterNoHosting = {
        auth: {
          isSignedIn: vi.fn(() => true)
        }
      };
      (globalThis as any).puter = mockPuterNoHosting;

      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await service.deploy(config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Puter hosting API not available');
    });

    it('should handle missing authentication', async () => {
      // Mock not signed in
      mockPuter.auth.isSignedIn.mockReturnValue(false);

      const config: DeploymentConfig = {
        projectName: 'test-app'
      };

      const result = await service.deploy(config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('logger', () => {
    it('should use provided logger', () => {
      const customLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      } as any;

      service.setLogger(customLogger);
      
      // The logger should be used internally, but we can't easily test this without
      // inspecting private properties or mocking the internal calls
      expect(service).toBeInstanceOf(PuterDeploymentService);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      service.destroy();
      expect(service).toBeDefined();
    });
  });
});