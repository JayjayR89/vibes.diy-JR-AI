/**
 * PuterDeploymentComponent - React component for Puter Cloud deployment UI
 * Provides deployment button, status feedback, and deployment management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PuterDeploymentManager, 
  DeploymentFeatureState, 
  DeploymentStatus, 
  DeploymentResult 
} from './PuterDeploymentManager.js';

interface PuterDeploymentComponentProps {
  /** PuterDeploymentManager instance */
  deploymentManager: PuterDeploymentManager;
  /** Default project name */
  defaultProjectName?: string;
  /** Whether to show advanced options */
  showAdvancedOptions?: boolean;
  /** Callback when deployment starts */
  onDeploymentStart?: (deploymentId: string) => void;
  /** Callback when deployment succeeds */
  onDeploymentSuccess?: (result: DeploymentResult) => void;
  /** Callback when deployment fails */
  onDeploymentError?: (error: string) => void;
  /** Callback when deployment is cancelled */
  onDeploymentCancel?: (deploymentId: string) => void;
}

export const PuterDeploymentComponent: React.FC<PuterDeploymentComponentProps> = ({
  deploymentManager,
  defaultProjectName = 'my-app',
  showAdvancedOptions = false,
  onDeploymentStart,
  onDeploymentSuccess,
  onDeploymentError,
  onDeploymentCancel
}) => {
  const [featureState, setFeatureState] = useState<DeploymentFeatureState>({
    available: false,
    activeDeployments: [],
    deploymentHistory: [],
    config: {
      enabled: true,
      defaultProjectName: 'my-app',
      defaultBuildCommand: 'npm run build',
      autoDeploy: false,
      maxConcurrentDeployments: 3,
      deploymentTimeout: 300000
    },
    totalDeployments: 0,
    successfulDeployments: 0
  });
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentInProgress, setDeploymentInProgress] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(defaultProjectName);
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [showLogs, setShowLogs] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentStatus | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  // Load feature state on mount
  useEffect(() => {
    const state = deploymentManager.getFeatureState();
    setFeatureState(state);
  }, [deploymentManager]);

  // Set up event listeners
  useEffect(() => {
    const unsubscribeDeploymentStart = deploymentManager.onDeploymentManagerEvent(
      'deployment-started',
      (event) => {
        setIsDeploying(true);
        setDeploymentInProgress(event.id);
        setDeploymentError(null);
        onDeploymentStart?.(event.id);
      }
    );

    const unsubscribeDeploymentSuccess = deploymentManager.onDeploymentManagerEvent(
      'deployment-success',
      (event) => {
        setIsDeploying(false);
        setDeploymentInProgress(null);
        onDeploymentSuccess?.(event);
      }
    );

    const unsubscribeDeploymentError = deploymentManager.onDeploymentManagerEvent(
      'deployment-error',
      (event) => {
        setIsDeploying(false);
        setDeploymentInProgress(null);
        setDeploymentError(event.error);
        onDeploymentError?.(event.error);
      }
    );

    const unsubscribeDeploymentCancel = deploymentManager.onDeploymentManagerEvent(
      'deployment-cancelled',
      (event) => {
        setIsDeploying(false);
        setDeploymentInProgress(null);
        onDeploymentCancel?.(event.id);
      }
    );

    const unsubscribeStatusUpdate = deploymentManager.onDeploymentManagerEvent(
      'status-update',
      (event) => {
        // Refresh feature state to get updated deployment info
        const state = deploymentManager.getFeatureState();
        setFeatureState(state);
      }
    );

    return () => {
      unsubscribeDeploymentStart();
      unsubscribeDeploymentSuccess();
      unsubscribeDeploymentError();
      unsubscribeDeploymentCancel();
      unsubscribeStatusUpdate();
    };
  }, [deploymentManager, onDeploymentStart, onDeploymentSuccess, onDeploymentError, onDeploymentCancel]);

  // Handle deployment
  const handleDeploy = useCallback(async () => {
    if (!featureState.available || isDeploying) {
      return;
    }

    try {
      setIsDeploying(true);
      setDeploymentError(null);

      const result = await deploymentManager.deploy(projectName, {
        buildCommand,
        onStatusUpdate: (status) => {
          setDeploymentInProgress(status.id);
        },
        onLogUpdate: (log) => {
          // Handle log updates if needed
          console.log('Deployment log:', log);
        }
      });

      if (result.success) {
        // Refresh feature state
        const state = deploymentManager.getFeatureState();
        setFeatureState(state);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      setDeploymentError(errorMessage);
      setIsDeploying(false);
      setDeploymentInProgress(null);
    }
  }, [featureState.available, isDeploying, projectName, buildCommand, deploymentManager]);

  // Handle deployment cancellation
  const handleCancelDeployment = useCallback(async (deploymentId: string) => {
    try {
      await deploymentManager.cancelDeployment(deploymentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel deployment';
      setDeploymentError(errorMessage);
    }
  }, [deploymentManager]);

  // Get deployment status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'building': return 'text-blue-600 dark:text-blue-400';
      case 'deploying': return 'text-yellow-600 dark:text-yellow-400';
      case 'pending': return 'text-gray-600 dark:text-gray-400';
      case 'cancelled': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'building': return '🔨';
      case 'deploying': return '🚀';
      case 'pending': return '⏳';
      case 'cancelled': return '⏹️';
      default: return '❓';
    }
  };

  // Check if deployment is available
  const canDeploy = featureState.available && !isDeploying && projectName.trim().length > 0;

  // Get current active deployment
  const activeDeployment = deploymentInProgress 
    ? featureState.deploymentHistory.find(d => d.id === deploymentInProgress) ||
      featureState.activeDeployments.find(d => d.id === deploymentInProgress)
    : null;

  return (
    <div className="space-y-6">
      {/* Deployment Header */}
      <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-light-primary dark:text-dark-primary text-lg font-semibold">
              Deploy to Puter Cloud
            </h3>
            <p className="text-light-primary/70 dark:text-dark-primary/70 text-sm mt-1">
              Deploy your application to Puter Cloud with automatic build and hosting
            </p>
          </div>
          
          {/* Feature Availability Status */}
          {featureState.available ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
              ✓ Available
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
              ✗ Unavailable
            </span>
          )}
        </div>

        {/* Deployment Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-light-primary dark:text-dark-primary">
              {featureState.totalDeployments}
            </div>
            <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">
              Total Deployments
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {featureState.successfulDeployments}
            </div>
            <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">
              Successful
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {featureState.activeDeployments.length}
            </div>
            <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">
              Active
            </div>
          </div>
        </div>

        {/* Deployment Form */}
        <div className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-light-primary dark:text-dark-primary mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              disabled={isDeploying}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-blue-400"
            />
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div>
              <label className="block text-sm font-medium text-light-primary dark:text-dark-primary mb-2">
                Build Command
              </label>
              <input
                type="text"
                value={buildCommand}
                onChange={(e) => setBuildCommand(e.target.value)}
                placeholder="npm run build"
                disabled={isDeploying}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-blue-400"
              />
            </div>
          )}

          {/* Deploy Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeploy}
              disabled={!canDeploy}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              {isDeploying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deploying...
                </>
              ) : (
                <>
                  🚀 Deploy to Puter Cloud
                </>
              )}
            </button>
            
            {featureState.activeDeployments.length >= featureState.config.maxConcurrentDeployments! && (
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Maximum concurrent deployments reached
              </span>
            )}
          </div>

          {/* Error Display */}
          {deploymentError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              <strong>Error:</strong> {deploymentError}
            </div>
          )}
        </div>
      </div>

      {/* Active Deployment Status */}
      {activeDeployment && (
        <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-light-primary dark:text-dark-primary font-medium">
              Deployment in Progress
            </h4>
            <button
              onClick={() => handleCancelDeployment(activeDeployment.id)}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
            >
              Cancel
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`font-medium ${getStatusColor(activeDeployment.status)}`}>
                {getStatusIcon(activeDeployment.status)} {activeDeployment.currentStep}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {activeDeployment.progress}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${activeDeployment.progress}%` }}
              ></div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Started: {new Date(activeDeployment.startedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Deployment History */}
      {featureState.deploymentHistory.length > 0 && (
        <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-light-primary dark:text-dark-primary font-medium">
              Deployment History
            </h4>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
          </div>
          
          <div className="space-y-3">
            {featureState.deploymentHistory.slice(0, 5).map((deployment) => (
              <div
                key={deployment.id}
                className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${getStatusColor(deployment.status)}`}>
                      {getStatusIcon(deployment.status)}
                    </span>
                    <div>
                      <div className="font-medium text-light-primary dark:text-dark-primary">
                        {deployment.metadata?.projectName || 'Unknown Project'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(deployment.startedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {deployment.url && (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        View App →
                      </a>
                    )}
                    {deployment.error && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {deployment.error}
                      </div>
                    )}
                  </div>
                </div>
                
                {showLogs && deployment.logs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Deployment Logs:
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
                      {deployment.logs.slice(-5).map((log, index) => (
                        <div key={index} className="text-xs">
                          <span className="text-gray-500 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}:
                          </span>
                          <span className={`ml-2 ${
                            log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                            log.level === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Unavailable Message */}
      {!featureState.available && (
        <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                Deployment Feature Unavailable
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                The Puter deployment feature requires Puter hosting capabilities to be available. 
                Please ensure you are in a Puter environment with hosting permissions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuterDeploymentComponent;