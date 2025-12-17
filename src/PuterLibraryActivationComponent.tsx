/**
 * PuterLibraryActivationComponent - React component for Puter library activation
 * Integrates with PuterLibraryActivator and provides UI for library management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PuterLibraryActivator, PuterActivationStatus, PuterLibraryActivationOptions } from '../../src/PuterLibraryActivator.js';

interface PuterLibraryActivationComponentProps {
  /** Project ID for project-specific activation */
  projectId: string;
  /** PuterLibraryActivator instance */
  activator: PuterLibraryActivator;
  /** Whether library is selected in dependencies */
  librarySelected: boolean;
  /** Callback when library selection changes */
  onLibraryToggle: (selected: boolean) => void;
  /** Authentication token callback */
  onAuthTokenRequest?: () => Promise<string | null>;
  /** Success callback */
  onActivationSuccess?: (features: string[]) => void;
  /** Error callback */
  onActivationError?: (error: string) => void;
}

export const PuterLibraryActivationComponent: React.FC<PuterLibraryActivationComponentProps> = ({
  projectId,
  activator,
  librarySelected,
  onLibraryToggle,
  onAuthTokenRequest,
  onActivationSuccess,
  onActivationError
}) => {
  const [activationStatus, setActivationStatus] = useState<PuterActivationStatus>({
    active: false,
    availableFeatures: [],
    enabledFeatures: [],
    authenticated: false,
    loaded: false
  });
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['puter-core']);

  // Load activation status on mount and when project changes
  useEffect(() => {
    const status = activator.getActivationStatus();
    setActivationStatus(status);
    
    // Load available features
    const availableFeatures = activator.getAvailableFeatures();
    setActivationStatus(prev => ({
      ...prev,
      availableFeatures
    }));
  }, [activator, projectId]);

  // Handle library selection toggle
  const handleLibraryToggle = useCallback(async (checked: boolean) => {
    onLibraryToggle(checked);
    
    if (checked) {
      await activateLibrary();
    } else {
      await deactivateLibrary();
    }
  }, [onLibraryToggle]);

  // Activate Puter library
  const activateLibrary = useCallback(async () => {
    setIsActivating(true);
    try {
      const options: PuterLibraryActivationOptions = {
        projectId,
        features: selectedFeatures,
        autoEnable: true,
        onAuthRequired: onAuthTokenRequest,
        onActivationSuccess: (features) => {
          setActivationStatus(prev => ({
            ...prev,
            active: true,
            lastActivated: Date.now(),
            error: undefined
          }));
          onActivationSuccess?.(features);
        },
        onActivationError: (error) => {
          setActivationStatus(prev => ({
            ...prev,
            error
          }));
          onActivationError?.(error);
        }
      };

      await activator.activateLibrary(projectId, options);
      
      // Update status after successful activation
      const newStatus = activator.getActivationStatus();
      setActivationStatus(newStatus);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setActivationStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      onActivationError?.(errorMessage);
    } finally {
      setIsActivating(false);
    }
  }, [activator, projectId, selectedFeatures, onAuthTokenRequest, onActivationSuccess, onActivationError]);

  // Deactivate Puter library
  const deactivateLibrary = useCallback(async () => {
    setIsDeactivating(true);
    try {
      await activator.deactivateLibrary(projectId);
      
      setActivationStatus(prev => ({
        ...prev,
        active: false,
        enabledFeatures: [],
        error: undefined
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deactivation failed';
      setActivationStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
    } finally {
      setIsDeactivating(false);
    }
  }, [activator, projectId]);

  // Handle feature selection
  const handleFeatureToggle = useCallback((featureId: string, checked: boolean) => {
    setSelectedFeatures(prev => {
      if (checked) {
        return [...prev, featureId];
      } else {
        return prev.filter(f => f !== featureId);
      }
    });
  }, []);

  // Determine if we can activate
  const canActivate = librarySelected && !isActivating && !isDeactivating;
  const isProcessing = isActivating || isDeactivating;

  return (
    <div className="space-y-4">
      {/* Main Library Toggle */}
      <div className="border-light-decorative-01 dark:border-dark-decorative-01 flex items-start gap-3 rounded-md border p-4">
        <input
          type="checkbox"
          checked={librarySelected}
          onChange={(e) => handleLibraryToggle(e.target.checked)}
          disabled={isProcessing}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-light-primary dark:text-dark-primary font-medium">
              Puter.js Library
            </h4>
            {activationStatus.active && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                ✓ Active
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {isActivating ? 'Activating...' : 'Deactivating...'}
              </span>
            )}
            {!activationStatus.loaded && librarySelected && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                Loading...
              </span>
            )}
          </div>
          <p className="text-light-primary/70 dark:text-dark-primary/70 mt-1 text-sm">
            Enable Puter.js library for cloud services, AI integration, and advanced features.
            Includes authentication, file system, AI models, and hosting capabilities.
          </p>
        </div>
      </div>

      {/* Feature Selection (shown when library is selected) */}
      {librarySelected && (
        <div className="ml-7 space-y-3">
          <h5 className="text-light-primary dark:text-dark-primary text-sm font-medium">
            Select Features to Activate:
          </h5>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activationStatus.availableFeatures.map((featureId) => {
              const featureLabels: Record<string, string> = {
                'puter-core': 'Core Library',
                'ai-models': 'AI Models',
                'hosting': 'Hosting',
                'file-system': 'File System',
                'kv-storage': 'KV Storage',
                'auth': 'Authentication'
              };
              
              const featureDescriptions: Record<string, string> = {
                'puter-core': 'Basic Puter.js functionality',
                'ai-models': 'Access to Puter AI models and chat',
                'hosting': 'Deploy apps to Puter Cloud',
                'file-system': 'File system operations',
                'kv-storage': 'Key-value storage',
                'auth': 'User authentication'
              };

              const isChecked = selectedFeatures.includes(featureId);
              
              return (
                <label
                  key={featureId}
                  className="border-light-decorative-01 dark:border-dark-decorative-01 flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleFeatureToggle(featureId, e.target.checked)}
                    disabled={isProcessing}
                    className="mt-0.5 h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span>
                    <span className="font-medium">
                      {featureLabels[featureId] || featureId}
                    </span>
                    <span className="text-light-primary/60 dark:text-dark-primary/60 block text-xs">
                      {featureDescriptions[featureId] || 'Puter feature'}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {/* Activation Controls */}
          {librarySelected && !activationStatus.active && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={activateLibrary}
                disabled={!canActivate || selectedFeatures.length === 0}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                {isActivating ? 'Activating...' : 'Activate Puter'}
              </button>
              {selectedFeatures.length === 0 && (
                <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                  Select at least one feature to activate
                </span>
              )}
            </div>
          )}

          {activationStatus.active && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={deactivateLibrary}
                disabled={isProcessing}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600"
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
              <span className="text-green-600 dark:text-green-400 text-xs">
                Last activated: {activationStatus.lastActivated ? 
                  new Date(activationStatus.lastActivated).toLocaleTimeString() : 
                  'Unknown'
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {activationStatus.error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          <strong>Error:</strong> {activationStatus.error}
        </div>
      )}

      {activationStatus.active && activationStatus.enabledFeatures.length > 0 && (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
          <strong>Active Features:</strong> {activationStatus.enabledFeatures.join(', ')}
        </div>
      )}

      {/* Authentication Status */}
      {librarySelected && !activationStatus.authenticated && (
        <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-300">
          <strong>Authentication Required:</strong> Some Puter features require authentication. 
          Please sign in through the global settings to enable full functionality.
        </div>
      )}
    </div>
  );
};

export default PuterLibraryActivationComponent;