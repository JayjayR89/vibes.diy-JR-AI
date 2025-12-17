/**
 * Test setup file for PuterFeatureManager tests
 * Sets up global mocks and test environment
 */

// Mock console methods
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator
Object.defineProperty(navigator, 'platform', {
  value: 'test-platform',
  writable: true,
});

// Mock document
Object.defineProperty(document, 'createElement', {
  value: vi.fn().mockReturnValue({
    getContext: vi.fn().mockReturnValue({}),
  }),
  writable: true,
});

// Mock setInterval/clearInterval for periodic sync
global.setInterval = vi.fn();
global.clearInterval = vi.fn();

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    localStorage: localStorageMock,
  },
  writable: true,
});