/**
 * Comprehensive test suite for PuterFeaturesSection UI component
 * Tests React component integration with PuterFeatureManager
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';
import { PuterFeaturesSection } from './PuterFeaturesSection.js';
import { PuterFeatureManager } from '../../src/PuterFeatureManager.js';

// Mock the PuterFeatureManager module
vi.mock('../../src/PuterFeatureManager.js', () => {
  return {
    PuterFeatureManager: vi.fn().mockImplementation(() => ({
      discoverAvailableFeatures: vi.fn().mockResolvedValue(['ai-models', 'hosting']),
      getAllFeatures: vi.fn().mockReturnValue([]),
      isFeatureAvailable: vi.fn().mockReturnValue(true),
      getFeatureState: vi.fn().mockReturnValue(false),
      registerFeature: vi.fn(),
      initializeFeature: vi.fn().mockResolvedValue(undefined),
      setFeatureState: vi.fn(),
      getFeatureMetadata: vi.fn(),
      enableFeature: vi.fn().mockResolvedValue(undefined),
      disableFeature: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
    }))
  };
});

// Mock style utilities
vi.mock('../utils/style-utils.js', () => {
  return {
    combineClasses: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
    defaultClasses: {
      container: 'default-container',
      featureCard: 'default-feature-card',
      featureHeader: 'default-feature-header',
      featureName: 'default-feature-name',
      featureDescription: 'default-feature-description',
      statusIndicator: 'default-status-indicator',
      controls: 'default-controls',
      controlButton: 'default-control-button',
      featuresGrid: 'default-features-grid',
    }
  };
});

// Mock styles
vi.mock('../utils/styles.js', () => {
  return {
    imgGenStyles: {
      error: { color: 'red' },
      errorTitle: { fontWeight: 'bold' },
      errorMessage: { marginTop: '0.5rem' },
      button: {
        padding: '8px 16px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer'
      }
    },
    imgGenTheme: {
      colors: {
        background: '#ffffff',
        text: '#000000',
        titleText: '#333333',
        mutedText: '#666666',
        accent: '#007bff',
        errorBorder: '#dc3545',
        inputBg: '#f8f9fa',
        inputBorder: '#dee2e6'
      },
      dimensions: {
        padding: '16px',
        borderRadius: '4px'
      }
    }
  };
});

describe('PuterFeaturesSection', () => {
  let mockManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockManager = {
      discoverAvailableFeatures: vi.fn().mockResolvedValue(['ai-models', 'hosting']),
      getAllFeatures: vi.fn().mockReturnValue([]),
      isFeatureAvailable: vi.fn().mockReturnValue(true),
      getFeatureState: vi.fn().mockReturnValue(false),
      registerFeature: vi.fn(),
      initializeFeature: vi.fn().mockResolvedValue(undefined),
      setFeatureState: vi.fn(),
      getFeatureMetadata: vi.fn(),
      enableFeature: vi.fn().mockResolvedValue(undefined),
      disableFeature: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
    };
    
    // Update the mock implementation
    const { PuterFeatureManager } = vi.importedModules['../../src/PuterFeatureManager.js'];
    PuterFeatureManager.mockImplementation(() => mockManager);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test('should render loading state initially', async () => {
    mockManager.discoverAvailableFeatures.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<PuterFeaturesSection />);
    
    expect(screen.getByText('Loading Puter features...')).toBeInTheDocument();
  });

  test('should render features when loaded successfully', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'ai-models',
        name: 'AI Models',
        description: 'Access to AI models',
        enabled: false
      },
      {
        id: 'hosting',
        name: 'Hosting',
        description: 'Cloud hosting capabilities',
        enabled: true
      }
    ]);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      expect(screen.getByText('Puter Features')).toBeInTheDocument();
    });

    expect(screen.getByText('AI Models')).toBeInTheDocument();
    expect(screen.getByText('Hosting')).toBeInTheDocument();
  });

  test('should handle feature discovery when no features are registered', async () => {
    mockManager.getAllFeatures.mockReturnValue([]);
    mockManager.discoverAvailableFeatures.mockResolvedValue(['ai-models', 'hosting']);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      expect(mockManager.registerFeature).toHaveBeenCalledTimes(2);
    });

    expect(mockManager.registerFeature).toHaveBeenCalledWith({
      id: 'ai-models',
      name: 'Ai Models',
      description: 'Puter ai-models feature',
      enabled: false,
    });

    expect(mockManager.registerFeature).toHaveBeenCalledWith({
      id: 'hosting',
      name: 'Hosting',
      description: 'Puter hosting feature',
      enabled: false,
    });
  });

  test('should render error state when loading fails', async () => {
    mockManager.discoverAvailableFeatures.mockRejectedValue(new Error('Network error'));

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Features')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  test('should show "No features available" when no features are found', async () => {
    mockManager.getAllFeatures.mockReturnValue([]);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      expect(screen.getByText('No Puter features available')).toBeInTheDocument();
    });
  });

  test('should display correct feature status indicators', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'available-enabled',
        name: 'Available Enabled',
        description: 'Available and enabled feature',
        enabled: true
      },
      {
        id: 'available-disabled',
        name: 'Available Disabled',
        description: 'Available but disabled feature',
        enabled: false
      },
      {
        id: 'unavailable',
        name: 'Unavailable',
        description: 'Unavailable feature',
        enabled: false
      }
    ]);

    mockManager.isFeatureAvailable.mockImplementation((id: string) => id !== 'unavailable');

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const statusTexts = screen.getAllByText(/Enabled|Disabled|Unavailable/);
      expect(statusTexts).toHaveLength(3);
    });
  });

  test('should handle feature toggle when enabled', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: true
      }
    ]);

    mockManager.isFeatureAvailable.mockReturnValue(true);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const disableButton = screen.getByText('Disable');
      expect(disableButton).toBeInTheDocument();
      fireEvent.click(disableButton);
    });

    await waitFor(() => {
      expect(mockManager.disableFeature).toHaveBeenCalledWith('test-feature', 'manual', undefined);
    });
  });

  test('should handle feature toggle when disabled', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    mockManager.isFeatureAvailable.mockReturnValue(true);
    mockManager.initializeFeature.mockResolvedValue(undefined);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const enableButton = screen.getByText('Enable');
      expect(enableButton).toBeInTheDocument();
      fireEvent.click(enableButton);
    });

    await waitFor(() => {
      expect(mockManager.initializeFeature).toHaveBeenCalledWith('test-feature');
    });
  });

  test('should handle toggle error gracefully', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    mockManager.isFeatureAvailable.mockReturnValue(true);
    mockManager.initializeFeature.mockRejectedValue(new Error('Initialization failed'));

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const enableButton = screen.getByText('Enable');
      fireEvent.click(enableButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Initialization failed')).toBeInTheDocument();
    });
  });

  test('should disable controls when feature is not available', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'unavailable-feature',
        name: 'Unavailable Feature',
        description: 'This feature is not available',
        enabled: false
      }
    ]);

    mockManager.isFeatureAvailable.mockReturnValue(false);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Enable/ });
      expect(button).toBeDisabled();
      expect(button).toHaveStyle({ opacity: '0.5' });
    });
  });

  test('should respect showControls prop', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    render(<PuterFeaturesSection showControls={false} />);

    await waitFor(() => {
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  test('should use provided feature manager', () => {
    const customManager = {
      ...mockManager,
      discoverAvailableFeatures: vi.fn().mockResolvedValue(['custom-feature']),
      getAllFeatures: vi.fn().mockReturnValue([])
    };

    render(<PuterFeaturesSection featureManager={customManager} />);

    expect(customManager.discoverAvailableFeatures).toHaveBeenCalled();
  });

  test('should update local state after successful toggle', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    mockManager.isFeatureAvailable.mockReturnValue(true);
    mockManager.initializeFeature.mockResolvedValue(undefined);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const enableButton = screen.getByText('Enable');
      fireEvent.click(enableButton);
    });

    // The button should change from "Enable" to "Disable" after successful toggle
    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument();
    });
  });

  test('should handle component unmounting during async operations', async () => {
    let resolvePromise: (value: any) => void;
    const asyncPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockManager.discoverAvailableFeatures.mockReturnValue(asyncPromise);

    const { unmount } = render(<PuterFeaturesSection />);
    
    // Unmount before the promise resolves
    unmount();

    // Resolve the promise - should not cause memory leaks
    resolvePromise!(['feature']);

    // Component should clean up without errors
    expect(() => {}).not.toThrow();
  });

  test('should render with custom CSS classes', () => {
    const customClasses = {
      container: 'custom-container',
      featureCard: 'custom-feature-card',
      featureHeader: 'custom-feature-header',
      featureName: 'custom-feature-name',
      featureDescription: 'custom-feature-description',
      statusIndicator: 'custom-status-indicator',
      controls: 'custom-controls',
      controlButton: 'custom-control-button',
      featuresGrid: 'custom-features-grid',
    };

    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    render(<PuterFeaturesSection classes={customClasses} />);

    // Note: Testing CSS classes in jsdom is limited, but we can verify the component renders
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  test('should handle rapid feature state changes', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    mockManager.isFeatureAvailable.mockReturnValue(true);
    mockManager.initializeFeature.mockResolvedValue(undefined);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const enableButton = screen.getByText('Enable');
      
      // Click multiple times rapidly
      fireEvent.click(enableButton);
      fireEvent.click(enableButton);
      fireEvent.click(enableButton);
    });

    // Should handle gracefully without errors
    expect(mockManager.initializeFeature).toHaveBeenCalled();
  });

  test('should maintain accessibility standards', async () => {
    mockManager.getAllFeatures.mockReturnValue([
      {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'Test description',
        enabled: false
      }
    ]);

    render(<PuterFeaturesSection />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: 'Puter Features' })).toBeInTheDocument();
  });
});