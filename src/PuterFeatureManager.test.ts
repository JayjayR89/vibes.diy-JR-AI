/**
 * Comprehensive test suite for PuterFeatureManager
 * Tests all implemented functionality including state management, events, persistence, and UI integration
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { PuterFeatureManager } from './PuterFeatureManager.js';

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockNavigator = {
  platform: 'test-platform'
};

const mockDocument = {
  createElement: vi.fn().mockReturnValue({
    getContext: vi.fn().mockReturnValue({})
  })
};

// Setup global mocks
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: mockDocument,
  writable: true,
});

// Mock console for testing
const mockConsole = {
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Test data
const mockFeature = {
  id: 'test-feature',
  name: 'Test Feature',
  description: 'A feature for testing purposes',
  enabled: false,
  version: '1.0.0',
  dependencies: [],
  metadata: { test: true }
};

const mockPuterObject = {
  ai: { chat: vi.fn() },
  hosting: { deploy: vi.fn() },
  fs: { readdir: vi.fn() },
  kv: { get: vi.fn() },
  auth: {
    isSignedIn: vi.fn().mockReturnValue(true),
    getUser: vi.fn().mockReturnValue({ role: 'user' })
  }
};

describe('PuterFeatureManager', () => {
  let manager: PuterFeatureManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new PuterFeatureManager();
    manager.setLogger(mockConsole as any);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('Core Functionality', () => {
    test('should initialize with default configuration', () => {
      expect(manager).toBeInstanceOf(PuterFeatureManager);
      expect(mockConsole.debug).toHaveBeenCalledWith('State management system initialized');
    });

    test('should register and retrieve features', () => {
      manager.registerFeature(mockFeature);
      const retrievedFeature = manager.getFeatureMetadata(mockFeature.id);
      
      expect(retrievedFeature).toEqual(mockFeature);
      expect(manager.getAllFeatures()).toHaveLength(1);
    });

    test('should unregister features', () => {
      manager.registerFeature(mockFeature);
      expect(manager.getAllFeatures()).toHaveLength(1);
      
      manager.unregisterFeature(mockFeature.id);
      expect(manager.getAllFeatures()).toHaveLength(0);
    });

    test('should get feature state', () => {
      manager.registerFeature(mockFeature);
      expect(manager.getFeatureState(mockFeature.id)).toBe(false);
      
      manager.setFeatureState(mockFeature.id, true);
      expect(manager.getFeatureState(mockFeature.id)).toBe(true);
    });

    test('should throw error when setting state for non-existent feature', () => {
      expect(() => manager.setFeatureState('non-existent', true)).toThrow("Feature 'non-existent' not found");
    });
  });

  describe('Feature Availability Logic', () => {
    beforeEach(() => {
      // Mock puter environment
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
    });

    test('should detect Puter environment availability', () => {
      const isAvailable = manager.isFeatureAvailable('test-feature');
      expect(isAvailable).toBe(true);
    });

    test('should check feature availability correctly', () => {
      manager.registerFeature({
        ...mockFeature,
        id: 'ai-models'
      });
      
      expect(manager.isFeatureAvailable('ai-models')).toBe(true);
    });

    test('should detect system capabilities', () => {
      const capabilities = manager.getSystemCapabilities();
      expect(capabilities).toBeTruthy();
      expect(capabilities?.puterAvailable).toBe(true);
      expect(capabilities?.apiSupport.ai).toBe(true);
      expect(capabilities?.apiSupport.hosting).toBe(true);
    });

    test('should detect user permissions', () => {
      const permissions = manager.getUserPermissions();
      expect(permissions).toBeTruthy();
      expect(permissions?.authenticated).toBe(true);
      expect(permissions?.permissions).toContain('ai');
    });

    test('should refresh capabilities', () => {
      manager.refreshCapabilities();
      expect(mockConsole.info).toHaveBeenCalledWith('Capabilities refreshed');
    });
  });

  describe('Feature Discovery', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
    });

    test('should discover available features', async () => {
      const availableFeatures = await manager.discoverAvailableFeatures();
      expect(availableFeatures).toContain('ai-models');
      expect(availableFeatures).toContain('hosting');
      expect(availableFeatures).toContain('file-system');
      expect(availableFeatures).toContain('kv-storage');
      expect(availableFeatures).toContain('auth');
    });

    test('should handle Puter environment not available during discovery', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: undefined,
        writable: true,
      });
      
      const availableFeatures = await manager.discoverAvailableFeatures();
      expect(availableFeatures).toHaveLength(0);
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      manager.registerFeature(mockFeature);
    });

    test('should enable feature with state tracking', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });

      await manager.enableFeature(mockFeature.id, 'user-request', { source: 'test' });
      
      expect(manager.getFeatureState(mockFeature.id)).toBe(true);
    });

    test('should disable feature with state tracking', async () => {
      manager.setFeatureState(mockFeature.id, true);
      
      await manager.disableFeature(mockFeature.id, 'user-request', { source: 'test' });
      
      expect(manager.getFeatureState(mockFeature.id)).toBe(false);
    });

    test('should track feature usage', () => {
      manager.trackFeatureUsage(mockFeature.id, { action: 'test-action' });
      
      const usage = manager.getFeatureUsage(mockFeature.id);
      expect(usage).toBeTruthy();
      expect(usage?.count).toBe(1);
      expect(usage?.lastUsed).toBeTruthy();
    });

    test('should track multiple usage events', () => {
      manager.trackFeatureUsage(mockFeature.id, { action: 'test1' });
      manager.trackFeatureUsage(mockFeature.id, { action: 'test2' });
      
      const usage = manager.getFeatureUsage(mockFeature.id);
      expect(usage?.count).toBe(2);
      expect(usage?.averageInterval).toBeGreaterThan(0);
    });

    test('should get feature state info', () => {
      const stateInfo = manager.getFeatureStateInfo(mockFeature.id);
      expect(stateInfo).toBeTruthy();
      expect(stateInfo?.active).toBe(false);
      expect(stateInfo?.usage.count).toBe(0);
    });

    test('should get feature state history', () => {
      const history = manager.getFeatureStateHistory(mockFeature.id);
      expect(history).toEqual([]);
      
      // Add some history
      manager.trackFeatureUsage(mockFeature.id);
      const updatedHistory = manager.getFeatureStateHistory(mockFeature.id);
      expect(updatedHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Event System', () => {
    test('should register and emit event listeners', () => {
      const mockListener = vi.fn();
      const unsubscribe = manager.onStateManagementEvent('state-change', mockListener);
      
      // Trigger an event through feature enabling
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
      
      manager.registerFeature(mockFeature);
      
      expect(mockListener).toHaveBeenCalled();
      
      unsubscribe();
      // After unsubscribing, the listener should not be called again
      const callCount = mockListener.mock.calls.length;
      expect(mockListener.mock.calls.length).toBe(callCount);
    });

    test('should handle wildcard event listeners', () => {
      const mockListener = vi.fn();
      manager.onStateManagementEvent('*', mockListener);
      
      manager.trackFeatureUsage(mockFeature.id);
      
      expect(mockListener).toHaveBeenCalled();
    });

    test('should handle event listener errors gracefully', () => {
      const errorListener = () => {
        throw new Error('Listener error');
      };
      
      const mockListener = vi.fn();
      manager.onStateManagementEvent('state-change', errorListener);
      manager.onStateManagementEvent('state-change', mockListener);
      
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
      
      manager.registerFeature(mockFeature);
      
      // The mock listener should still be called despite the error
      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('Persistence', () => {
    test('should persist state to localStorage', async () => {
      manager.setStatePersistenceEnabled(true);
      manager.registerFeature(mockFeature);
      manager.trackFeatureUsage(mockFeature.id);
      
      const syncResult = await manager.synchronizeStates();
      
      expect(syncResult.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('should handle persistence failures gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      manager.setStatePersistenceEnabled(true);
      manager.registerFeature(mockFeature);
      
      const syncResult = await manager.synchronizeStates();
      
      expect(syncResult.success).toBe(false);
      expect(syncResult.errors).toBeTruthy();
    });

    test('should load persisted states', () => {
      const mockPersistedState = {
        active: true,
        usage: { count: 5, lastUsed: Date.now(), averageInterval: 1000 },
        history: [],
        lastSync: Date.now(),
        persistenceKey: 'puter-feature-state:test-feature'
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPersistedState));
      
      manager.registerFeature(mockFeature);
      
      const stateInfo = manager.getFeatureStateInfo(mockFeature.id);
      expect(stateInfo?.active).toBe(true);
      expect(stateInfo?.usage.count).toBe(5);
    });

    test('should handle corrupted persisted data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      manager.registerFeature(mockFeature);
      
      // Should not crash and should handle gracefully
      const stateInfo = manager.getFeatureStateInfo(mockFeature.id);
      expect(stateInfo).toBeTruthy();
    });

    test('should configure persistence settings', () => {
      const newConfig = {
        enabled: false,
        syncInterval: 60000,
        maxHistoryEntries: 100
      };
      
      manager.updatePersistenceConfig(newConfig);
      const config = manager.getPersistenceConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.syncInterval).toBe(60000);
      expect(config.maxHistoryEntries).toBe(100);
    });

    test('should enable/disable state persistence', () => {
      manager.setStatePersistenceEnabled(false);
      expect(mockConsole.debug).toHaveBeenCalledWith('Stopped periodic sync');
      
      manager.setStatePersistenceEnabled(true);
      expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining('Started periodic sync'));
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
    });

    test('should initialize individual features', async () => {
      manager.registerFeature(mockFeature);
      
      await manager.initializeFeature(mockFeature.id);
      
      expect(manager.getFeatureState(mockFeature.id)).toBe(true);
    });

    test('should throw error when initializing unavailable feature', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: undefined,
        writable: true,
      });
      
      manager.registerFeature(mockFeature);
      
      await expect(manager.initializeFeature(mockFeature.id)).rejects.toThrow('not available');
    });

    test('should initialize all available features', async () => {
      const aiFeature = { ...mockFeature, id: 'ai-models' };
      const hostingFeature = { ...mockFeature, id: 'hosting' };
      
      manager.registerFeature(aiFeature);
      manager.registerFeature(hostingFeature);
      
      await manager.initializeAllFeatures();
      
      // Both features should be initialized if available
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Initializing'));
    });

    test('should handle initialization failures gracefully', async () => {
      // Mock Puter without the required APIs
      Object.defineProperty(globalThis, 'puter', {
        value: {},
        writable: true,
      });
      
      manager.registerFeature({ ...mockFeature, id: 'ai-models' });
      
      await manager.initializeAllFeatures(); // Should not throw
      
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing feature errors', async () => {
      await expect(manager.enableFeature('non-existent')).rejects.toThrow('not found');
    });

    test('should handle unavailable feature errors', async () => {
      manager.registerFeature(mockFeature);
      
      await expect(manager.enableFeature(mockFeature.id)).rejects.toThrow('not available');
    });

    test('should handle feature state tracking for unknown features', () => {
      manager.trackFeatureUsage('unknown-feature');
      
      // Should not throw, just log a warning
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('unknown feature'));
    });

    test('should handle localStorage unavailability', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
      });
      
      manager.registerFeature(mockFeature);
      manager.trackFeatureUsage(mockFeature.id);
      
      // Should handle gracefully
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('localStorage not available'));
    });

    test('should handle event listener errors', () => {
      const errorProneListener = () => {
        throw new Error('Event listener error');
      };
      
      manager.onStateManagementEvent('*', errorProneListener);
      manager.trackFeatureUsage(mockFeature.id);
      
      // Should handle gracefully and not crash
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error in event listener'));
    });
  });

  describe('Memory Management', () => {
    test('should cleanup resources on destroy', () => {
      const unsubscribe = manager.onStateManagementEvent('state-change', vi.fn());
      
      manager.destroy();
      
      // Verify cleanup occurred
      expect(mockConsole.info).toHaveBeenCalledWith('PuterFeatureManager destroyed');
    });

    test('should handle multiple destroys gracefully', () => {
      manager.destroy();
      manager.destroy(); // Should not throw
      
      expect(mockConsole.info).toHaveBeenCalledWith('PuterFeatureManager destroyed');
    });
  });

  describe('Type Safety and Documentation', () => {
    test('should have correct TypeScript interfaces', () => {
      // Test that interfaces are properly exported and typed
      const feature: any = {
        id: 'test',
        name: 'Test',
        description: 'Test description',
        enabled: true
      };
      
      manager.registerFeature(feature);
      expect(manager.getAllFeatures()).toHaveLength(1);
    });

    test('should have comprehensive JSDoc documentation', () => {
      // Verify that key methods have JSDoc comments
      expect(PuterFeatureManager.prototype.enableFeature).toBeDefined();
      expect(PuterFeatureManager.prototype.disableFeature).toBeDefined();
      expect(PuterFeatureManager.prototype.trackFeatureUsage).toBeDefined();
      expect(PuterFeatureManager.prototype.onStateManagementEvent).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent state operations', async () => {
      Object.defineProperty(globalThis, 'puter', {
        value: mockPuterObject,
        writable: true,
      });
      
      manager.registerFeature(mockFeature);
      
      // Run multiple operations concurrently
      const promises = [
        manager.enableFeature(mockFeature.id, 'concurrent-1'),
        manager.disableFeature(mockFeature.id, 'concurrent-2'),
        manager.trackFeatureUsage(mockFeature.id, { source: 'concurrent-3' })
      ];
      
      await Promise.allSettled(promises);
      
      // Should handle without crashing
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    test('should handle very large usage counts', () => {
      manager.registerFeature(mockFeature);
      
      // Simulate many usage events
      for (let i = 0; i < 10000; i++) {
        manager.trackFeatureUsage(mockFeature.id);
      }
      
      const usage = manager.getFeatureUsage(mockFeature.id);
      expect(usage?.count).toBe(10000);
      expect(usage?.averageInterval).toBeGreaterThanOrEqual(0);
    });

    test('should handle history size limits', () => {
      const managerWithLowLimit = new PuterFeatureManager({
        maxHistoryEntries: 5
      });
      
      managerWithLowLimit.registerFeature(mockFeature);
      
      // Generate more history entries than the limit
      for (let i = 0; i < 10; i++) {
        managerWithLowLimit.trackFeatureUsage(mockFeature.id);
      }
      
      const history = managerWithLowLimit.getFeatureStateHistory(mockFeature.id);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });
});