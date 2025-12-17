/**
 * Comprehensive test suite for PuterLibraryActivator
 * Tests library activation, project-specific configuration, and integration with PuterFeatureManager
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PuterLibraryActivator, PuterLibraryConfig, PuterLibraryActivationOptions } from './PuterLibraryActivator.js';
import { PuterFeatureManager } from './PuterFeatureManager.js';

// Mock console for testing
const mockConsole = {
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockDocument = {
  createElement: vi.fn().mockReturnValue({
    appendChild: vi.fn(),
    onload: null,
    onerror: null,
    src: ''
  })
};

// Setup global mocks
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: mockDocument,
  writable: true,
});

// Mock puter object
const mockPuterObject = {
  auth: {
    isSignedIn: vi.fn().mockReturnValue(true),
    getUser: vi.fn().mockReturnValue({ token: 'mock-token' })
  }
};

describe('PuterLibraryActivator', () => {
  let activator: PuterLibraryActivator;
  let featureManager: PuterFeatureManager;
  const mockProjectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
    featureManager = new PuterFeatureManager();
    featureManager.setLogger(mockConsole as any);
    activator = new PuterLibraryActivator(featureManager);
    activator.setLogger(mockConsole as any);
  });

  afterEach(() => {
    activator.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(activator).toBeInstanceOf(PuterLibraryActivator);
      expect(mockConsole.debug).toHaveBeenCalledWith('PuterLibraryActivator initialized');
    });

    test('should initialize with initial configurations', () => {
      const initialConfigs = new Map<string, PuterLibraryConfig>();
      initialConfigs.set('test-project', {
        enabled: true,
        features: ['puter-core', 'ai-models'],
        requiresAuth: false,
        autoActivate: true
      });

      const activatorWithConfigs = new PuterLibraryActivator(featureManager, initialConfigs);
      expect(activatorWithConfigs).toBeInstanceOf(PuterLibraryActivator);
    });
  });

  describe('Library Availability', () => {
    test('should check library availability correctly', () => {
      const isAvailable = activator.isLibraryAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    test('should get available features', () => {
      const features = activator.getAvailableFeatures();
      expect(Array.isArray(features)).toBe(true);
    });
  });

  describe('Project Configuration', () => {
    test('should get project configuration', () => {
      const config = activator.getProjectConfig('non-existent-project');
      expect(config).toBeUndefined();
    });

    test('should update project configuration', () => {
      const newConfig: Partial<PuterLibraryConfig> = {
        features: ['puter-core', 'ai-models'],
        autoActivate: false
      };

      activator.updateProjectConfig(mockProjectId, newConfig);
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Updated configuration for project')
      );
    });
  });

  describe('Library Activation', () => {
    beforeEach(() => {
      // Mock puter environment
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
    });

    test('should activate library successfully', async () => {
      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core'],
        autoEnable: true,
        onActivationSuccess: vi.fn(),
        onActivationError: vi.fn()
      };

      await expect(activator.activateLibrary(mockProjectId, options)).resolves.not.toThrow();
      
      const status = activator.getActivationStatus();
      expect(status.active).toBe(true);
      expect(status.lastActivated).toBeDefined();
    });

    test('should handle activation with authentication', async () => {
      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core'],
        requiresAuth: true,
        onAuthRequired: vi.fn().mockResolvedValue('mock-auth-token'),
        onActivationSuccess: vi.fn()
      };

      await expect(activator.activateLibrary(mockProjectId, options)).resolves.not.toThrow();
      expect(options.onActivationSuccess).toHaveBeenCalled();
    });

    test('should handle activation failure gracefully', async () => {
      // Mock auth failure
      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core'],
        requiresAuth: true,
        onAuthRequired: vi.fn().mockResolvedValue(null),
        onActivationError: vi.fn()
      };

      await expect(activator.activateLibrary(mockProjectId, options)).rejects.toThrow();
      expect(options.onActivationError).toHaveBeenCalled();
    });

    test('should load Puter.js library when not present', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: undefined,
        writable: true,
      });

      const mockScript = {
        appendChild: vi.fn(),
        onload: null,
        onerror: null,
        src: ''
      };
      mockDocument.createElement.mockReturnValue(mockScript);

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      // Mock script loading
      await new Promise(resolve => setTimeout(resolve, 0));
      mockScript.onload?.();

      await expect(activator.activateLibrary(mockProjectId, options)).resolves.not.toThrow();
    });

    test('should handle script loading failure', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: undefined,
        writable: true,
      });

      const mockScript = {
        appendChild: vi.fn(),
        onload: null,
        onerror: null,
        src: ''
      };
      mockDocument.createElement.mockReturnValue(mockScript);

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      // Mock script loading failure
      await new Promise(resolve => setTimeout(resolve, 0));
      mockScript.onerror?.();

      await expect(activator.activateLibrary(mockProjectId, options)).rejects.toThrow();
    });
  });

  describe('Library Deactivation', () => {
    beforeEach(() => {
      // Mock puter environment
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
    });

    test('should deactivate library successfully', async () => {
      // First activate
      const activationOptions: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };
      await activator.activateLibrary(mockProjectId, activationOptions);

      // Then deactivate
      await expect(activator.deactivateLibrary(mockProjectId)).resolves.not.toThrow();
      
      const status = activator.getActivationStatus();
      expect(status.active).toBe(false);
      expect(status.enabledFeatures).toEqual([]);
    });

    test('should handle deactivation of non-existent project', async () => {
      await expect(activator.deactivateLibrary('non-existent-project')).resolves.not.toThrow();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('No configuration found for project')
      );
    });
  });

  describe('Activation Status', () => {
    test('should return correct activation status', () => {
      const status = activator.getActivationStatus();
      
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('availableFeatures');
      expect(status).toHaveProperty('enabledFeatures');
      expect(status).toHaveProperty('authenticated');
      expect(status).toHaveProperty('loaded');
      expect(status).toHaveProperty('error');
    });

    test('should update status during activation', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });

      const initialStatus = activator.getActivationStatus();
      expect(initialStatus.active).toBe(false);

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      await activator.activateLibrary(mockProjectId, options);
      
      const updatedStatus = activator.getActivationStatus();
      expect(updatedStatus.active).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle feature manager errors gracefully', async () => {
      // Mock feature manager to throw errors
      const mockFeatureManager = {
        isFeatureAvailable: vi.fn().mockImplementation(() => {
          throw new Error('Feature manager error');
        }),
        onStateManagementEvent: vi.fn(),
        destroy: vi.fn()
      } as any;

      const failingActivator = new PuterLibraryActivator(mockFeatureManager);
      failingActivator.setLogger(mockConsole as any);

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      await expect(failingActivator.activateLibrary(mockProjectId, options)).rejects.toThrow();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should handle library loading errors', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: undefined,
        writable: true,
      });

      // Mock createElement to throw
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      await expect(activator.activateLibrary(mockProjectId, options)).rejects.toThrow();
    });
  });

  describe('Event System Integration', () => {
    test('should listen to feature manager events', async () => {
      const mockListener = vi.fn();
      
      // Set up event listener
      featureManager.onStateManagementEvent('state-change', mockListener);

      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      await activator.activateLibrary(mockProjectId, options);
      
      // Event should have been triggered (though the specific event depends on feature manager implementation)
      expect(featureManager.onStateManagementEvent).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      activator.destroy();
      expect(mockConsole.info).toHaveBeenCalledWith('PuterLibraryActivator destroyed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle multiple activation/deactivation cycles', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: ['puter-core']
      };

      // Multiple activation/deactivation cycles
      for (let i = 0; i < 3; i++) {
        await activator.activateLibrary(mockProjectId, options);
        await activator.deactivateLibrary(mockProjectId);
      }

      // Should handle gracefully without errors
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    test('should handle concurrent activations', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });

      const options1: PuterLibraryActivationOptions = {
        projectId: 'project-1',
        features: ['puter-core']
      };

      const options2: PuterLibraryActivationOptions = {
        projectId: 'project-2',
        features: ['ai-models']
      };

      // Run concurrently
      await Promise.all([
        activator.activateLibrary('project-1', options1),
        activator.activateLibrary('project-2', options2)
      ]);

      // Both should succeed
      expect(activator.getProjectConfig('project-1')).toBeDefined();
      expect(activator.getProjectConfig('project-2')).toBeDefined();
    });

    test('should handle empty features list', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });

      const options: PuterLibraryActivationOptions = {
        projectId: mockProjectId,
        features: []
      };

      await expect(activator.activateLibrary(mockProjectId, options)).resolves.not.toThrow();
      
      const status = activator.getActivationStatus();
      expect(status.active).toBe(true);
    });
  });
});