import React, { useEffect, useState } from "react";
import { PuterFeatureManager } from "../../PuterFeatureManager.js";
import { BrutalistCard } from "./vibes/BrutalistCard.js";
import puterModelsList from "../data/puter-models.json" with { type: "json" };

/**
 * Interface for Puter AI model information
 */
interface PuterAIModel {
  /** Unique identifier for the model */
  id: string;
  /** Human-readable name of the model */
  name: string;
  /** Description of the model's capabilities */
  description: string;
  /** Whether this is a featured model */
  featured?: boolean;
}

/**
 * Interface for model status information
 */
interface ModelStatus {
  /** Whether the model is available for use */
  available: boolean;
  /** Whether Puter AI service is authenticated */
  authenticated: boolean;
  /** Whether Puter environment is available */
  puterAvailable: boolean;
}

/**
 * Props for the PuterAIModelsDisplay component
 */
interface PuterAIModelsDisplayProps {
  /** Optional CSS class name */
  className?: string;
  /** Whether to show only featured models */
  featuredOnly?: boolean;
  /** Callback when a model is selected */
  onModelSelect?: (model: PuterAIModel) => void;
  /** Currently selected model ID */
  selectedModelId?: string;
}

/**
 * PuterAIModelsDisplay - A specialized UI component for displaying available Puter AI models
 *
 * This component shows Puter AI models with their details, capabilities, and status indicators.
 * It integrates with the PuterFeatureManager to determine model availability and authentication status.
 *
 * Features:
 * - Model cards with detailed information
 * - Status indicators for availability and authentication
 * - Responsive grid layout
 * - Integration with Puter feature management
 * - TypeScript support with proper typing
 *
 * @example
 * ```tsx
 * <PuterAIModelsDisplay
 *   onModelSelect={(model) => console.log('Selected:', model.name)}
 *   selectedModelId="puter/gpt-4"
 * />
 * ```
 */
export const PuterAIModelsDisplay: React.FC<PuterAIModelsDisplayProps> = ({
  className = "",
  featuredOnly = false,
  onModelSelect,
  selectedModelId,
}) => {
  const [featureManager] = useState(() => new PuterFeatureManager());
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    available: false,
    authenticated: false,
    puterAvailable: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check Puter AI availability and authentication status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true);

        // Check if AI models feature is available
        const aiAvailable = featureManager.isFeatureAvailable('ai-models');

        // Get system capabilities
        const capabilities = featureManager.getSystemCapabilities();
        const puterAvailable = capabilities?.puterAvailable ?? false;

        // Get user permissions
        const permissions = featureManager.getUserPermissions();
        const authenticated = permissions?.authenticated ?? false;

        setModelStatus({
          available: aiAvailable,
          authenticated,
          puterAvailable,
        });
      } catch (error) {
        console.error('Error checking Puter AI status:', error);
        setModelStatus({
          available: false,
          authenticated: false,
          puterAvailable: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();

    // Refresh status periodically
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [featureManager]);

  // Filter models based on featuredOnly prop
  const displayModels = featuredOnly
    ? puterModelsList.filter(model => model.featured)
    : puterModelsList;

  /**
   * Get status indicator for a model
   */
  const getStatusIndicator = (model: PuterAIModel) => {
    if (!modelStatus.puterAvailable) {
      return {
        icon: "❌",
        text: "Puter Unavailable",
        color: "text-red-500",
        bgColor: "bg-red-50 dark:bg-red-900/20",
      };
    }

    if (!modelStatus.authenticated) {
      return {
        icon: "🔒",
        text: "Authentication Required",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      };
    }

    if (!modelStatus.available) {
      return {
        icon: "⏳",
        text: "Feature Unavailable",
        color: "text-orange-500",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
      };
    }

    return {
      icon: "✅",
      text: "Available",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    };
  };

  /**
   * Handle model selection
   */
  const handleModelClick = (model: PuterAIModel) => {
    if (onModelSelect && modelStatus.available && modelStatus.authenticated) {
      onModelSelect(model);
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Checking Puter AI availability...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Overview */}
      <BrutalistCard size="sm" className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🤖</span>
            <h3 className="text-lg font-bold">Puter AI Models</h3>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <span className={modelStatus.puterAvailable ? "text-green-500" : "text-red-500"}>
                ●
              </span>
              <span>Puter: {modelStatus.puterAvailable ? "Available" : "Unavailable"}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={modelStatus.authenticated ? "text-green-500" : "text-yellow-500"}>
                ●
              </span>
              <span>Auth: {modelStatus.authenticated ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </BrutalistCard>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayModels.map((model) => {
          const status = getStatusIndicator(model);
          const isSelected = selectedModelId === model.id;
          const isClickable = modelStatus.available && modelStatus.authenticated;

          return (
            <BrutalistCard
              key={model.id}
              size="sm"
              variant={isSelected ? "success" : "default"}
              className={`cursor-${isClickable ? 'pointer' : 'not-allowed'} transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-green-500' : ''
              }`}
              onClick={() => handleModelClick(model)}
              style={{
                opacity: isClickable ? 1 : 0.7,
              }}
            >
              <div className="space-y-3">
                {/* Model Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-base flex items-center space-x-2">
                      <span>{model.name}</span>
                      {model.featured && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                          Featured
                        </span>
                      )}
                    </h4>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mt-1">
                      {model.id}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-green-600 text-lg">✓</span>
                  )}
                </div>

                {/* Model Description */}
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {model.description}
                </p>

                {/* Status Indicator */}
                <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${status.bgColor}`}>
                  <span className={status.color}>{status.icon}</span>
                  <span className={`font-medium ${status.color}`}>{status.text}</span>
                </div>

                {/* Capabilities (placeholder for future enhancement) */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    Chat
                  </span>
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                    Code Generation
                  </span>
                </div>
              </div>
            </BrutalistCard>
          );
        })}
      </div>

      {/* Help Text */}
      {!modelStatus.puterAvailable && (
        <BrutalistCard size="sm" variant="warning">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-sm">
              Puter.js is not loaded. Make sure you're accessing this from a Puter environment.
            </p>
          </div>
        </BrutalistCard>
      )}

      {modelStatus.puterAvailable && !modelStatus.authenticated && (
        <BrutalistCard size="sm" variant="warning">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">🔐</span>
            <p className="text-sm">
              Authentication required. Please sign in with Puter to use AI models.
            </p>
          </div>
        </BrutalistCard>
      )}
    </div>
  );
};

export default PuterAIModelsDisplay;