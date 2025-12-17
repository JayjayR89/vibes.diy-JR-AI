import React, { useState, useCallback } from "react";
import { puterDeploymentService, type PuterDeploymentOptions } from "../../lib/puter-deployment.js";

interface PuterDeploymentButtonProps {
  appName: string;
  appContent: string;
  onDeploymentSuccess?: (url: string, appId: string) => void;
  onDeploymentError?: (error: string) => void;
}

export const PuterDeploymentButton: React.FC<PuterDeploymentButtonProps> = ({
  appName,
  appContent,
  onDeploymentSuccess,
  onDeploymentError,
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{
    success?: boolean;
    url?: string;
    error?: string;
  }>({});

  const handleDeployToPuter = useCallback(async () => {
    setIsDeploying(true);
    setDeploymentResult({});

    try {
      // Check authentication first
      const isAuthenticated = await puterDeploymentService.isAuthenticated();
      if (!isAuthenticated) {
        const error = "Please login with Puter first in the settings.";
        setDeploymentResult({ success: false, error });
        onDeploymentError?.(error);
        return;
      }

      // Prepare deployment options
      const options: PuterDeploymentOptions = {
        appName,
        appContent,
        description: `Vibes DIY app: ${appName}`,
      };

      // Deploy to Puter Cloud
      const result = await puterDeploymentService.deployToPuterCloud(options);

      if (result.success && result.deploymentUrl) {
        setDeploymentResult({ success: true, url: result.deploymentUrl });
        onDeploymentSuccess?.(result.deploymentUrl, result.appId || "");
      } else {
        const error = result.error || "Deployment failed";
        setDeploymentResult({ success: false, error });
        onDeploymentError?.(error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown deployment error";
      setDeploymentResult({ success: false, error: errorMessage });
      onDeploymentError?.(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  }, [appName, appContent, onDeploymentSuccess, onDeploymentError]);

  if (deploymentResult.success && deploymentResult.url) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-800 dark:text-green-300 font-medium">Deployed Successfully!</span>
        </div>
        <div className="text-sm text-green-700 dark:text-green-400 mb-2">
          Your app is now live on Puter Cloud.
        </div>
        <a
          href={deploymentResult.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
        >
          View your app
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    );
  }

  if (deploymentResult.success === false) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-red-800 dark:text-red-300 font-medium">Deployment Failed</span>
        </div>
        <div className="text-sm text-red-700 dark:text-red-400 mb-3">
          {deploymentResult.error}
        </div>
        <button
          onClick={() => setDeploymentResult({})}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-light-background-00 dark:bg-dark-background-00 border-light-decorative-01 dark:border-dark-decorative-01 hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex cursor-pointer items-center rounded-lg border p-4 transition-colors"
      onClick={handleDeployToPuter}
    >
      <div className="flex-1">
        <div className="text-light-primary dark:text-dark-primary font-medium">
          Deploy to Puter Cloud
        </div>
        <div className="text-light-primary/70 dark:text-dark-primary/70 text-sm">
          {isDeploying ? "Deploying..." : "Deploy your app to Puter Cloud hosting"}
        </div>
      </div>
      {isDeploying && (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      )}
    </div>
  );
};

export default PuterDeploymentButton;