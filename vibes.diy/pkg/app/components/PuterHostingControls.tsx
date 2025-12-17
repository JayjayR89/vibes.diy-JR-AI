import React, { useEffect, useState, useCallback } from "react";
import { PuterFeatureManager } from "../../PuterFeatureManager.js";
import { BrutalistCard } from "./vibes/BrutalistCard.js";

/**
 * Interface for hosting service information
 */
interface HostingService {
  /** Unique identifier for the service */
  id: string;
  /** Human-readable name of the service */
  name: string;
  /** Description of the service capabilities */
  description: string;
  /** Service type/category */
  type: "deployment" | "runtime" | "storage" | "cdn";
  /** Whether this is a featured service */
  featured?: boolean;
  /** Service-specific configuration options */
  config?: Record<string, any>;
}

/**
 * Interface for hosting status information
 */
interface HostingStatus {
  /** Whether the hosting service is available */
  available: boolean;
  /** Whether Puter hosting service is authenticated */
  authenticated: boolean;
  /** Whether Puter environment is available */
  puterAvailable: boolean;
  /** Current hosting service state */
  serviceState: "active" | "inactive" | "error" | "maintenance";
  /** Number of active deployments */
  activeDeployments?: number;
  /** Storage usage information */
  storageUsage?: {
    used: number;
    total: number;
    unit: string;
  };
}

/**
 * Props for the PuterHostingControls component
 */
interface PuterHostingControlsProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when hosting configuration changes */
  onConfigChange?: (serviceId: string, config: Record<string, any>) => void;
  /** Callback when a service action is performed */
  onServiceAction?: (serviceId: string, action: string) => void;
  /** Currently selected service ID */
  selectedServiceId?: string;
  /** Whether to show only featured services */
  featuredOnly?: boolean;
  /** Whether to show deployment controls */
  showDeployments?: boolean;
}

/**
 * Default hosting services configuration
 */
const defaultHostingServices: HostingService[] = [
  {
    id: "puter-cloud",
    name: "Puter Cloud",
    description: "Deploy and host applications on Puter's global cloud infrastructure",
    type: "deployment",
    featured: true,
    config: {
      autoScale: true,
      region: "auto",
      tier: "standard"
    }
  },
  {
    id: "puter-runtime",
    name: "Puter Runtime",
    description: "Serverless execution environment for your applications",
    type: "runtime",
    featured: true,
    config: {
      timeout: 30,
      memory: "128MB",
      concurrency: 10
    }
  },
  {
    id: "puter-storage",
    name: "Puter Storage",
    description: "Distributed file storage with global CDN",
    type: "storage",
    featured: false,
    config: {
      encryption: true,
      cdn: true,
      backup: "daily"
    }
  },
  {
    id: "puter-cdn",
    name: "Puter CDN",
    description: "Global content delivery network for fast asset distribution",
    type: "cdn",
    featured: false,
    config: {
      compression: "gzip",
      cache: "aggressive"
    }
  }
];

/**
 * PuterHostingControls - A specialized UI component for managing Puter hosting features
 *
 * This component provides comprehensive controls for managing Puter hosting services,
 * including service configuration, status monitoring, and deployment management.
 * It integrates with the PuterFeatureManager to determine service availability and authentication status.
 *
 * Features:
 * - Service cards with detailed information and controls
 * - Real-time status indicators and monitoring
 * - Configuration management for hosting services
 * - Deployment controls and history
 * - Responsive grid layout
 * - Integration with Puter feature management
 * - TypeScript support with proper typing
 *
 * @example
 * ```tsx
 * <PuterHostingControls
 *   onConfigChange={(serviceId, config) => console.log('Config updated:', serviceId, config)}
 *   onServiceAction={(serviceId, action) => console.log('Action:', serviceId, action)}
 *   selectedServiceId="puter-cloud"
 *   showDeployments={true}
 * />
 * ```
 */
export const PuterHostingControls: React.FC<PuterHostingControlsProps> = ({
  className = "",
  onConfigChange,
  onServiceAction,
  selectedServiceId,
  featuredOnly = false,
  showDeployments = true,
}) => {
  const [featureManager] = useState(() => new PuterFeatureManager());
  const [hostingStatus, setHostingStatus] = useState<HostingStatus>({
    available: false,
    authenticated: false,
    puterAvailable: false,
    serviceState: "inactive",
    activeDeployments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Check Puter hosting availability and authentication status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true);

        // Check if hosting feature is available
        const hostingAvailable = featureManager.isFeatureAvailable('hosting');

        // Get system capabilities
        const capabilities = featureManager.getSystemCapabilities();
        const puterAvailable = capabilities?.puterAvailable ?? false;

        // Get user permissions
        const permissions = featureManager.getUserPermissions();
        const authenticated = permissions?.authenticated ?? false;

        // Get hosting service state (mock implementation)
        const serviceState = hostingAvailable && authenticated ? "active" : "inactive";

        setHostingStatus({
          available: hostingAvailable,
          authenticated,
          puterAvailable,
          serviceState,
          activeDeployments: hostingAvailable ? Math.floor(Math.random() * 5) : 0, // Mock data
          storageUsage: puterAvailable ? {
            used: 1024,
            total: 10240,
            unit: "MB"
          } : undefined,
        });
      } catch (error) {
        console.error('Error checking Puter hosting status:', error);
        setHostingStatus({
          available: false,
          authenticated: false,
          puterAvailable: false,
          serviceState: "error",
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

  // Filter services based on featuredOnly prop
  const displayServices = featuredOnly
    ? defaultHostingServices.filter(service => service.featured)
    : defaultHostingServices;

  /**
   * Get status indicator for hosting service
   */
  const getStatusIndicator = (service: HostingService) => {
    if (!hostingStatus.puterAvailable) {
      return {
        icon: "❌",
        text: "Puter Unavailable",
        color: "text-red-500",
        bgColor: "bg-red-50 dark:bg-red-900/20",
      };
    }

    if (!hostingStatus.authenticated) {
      return {
        icon: "🔒",
        text: "Authentication Required",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      };
    }

    if (!hostingStatus.available) {
      return {
        icon: "⏳",
        text: "Service Unavailable",
        color: "text-orange-500",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
      };
    }

    const stateColors = {
      active: { color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20", icon: "✅", text: "Active" },
      inactive: { color: "text-gray-500", bgColor: "bg-gray-50 dark:bg-gray-900/20", icon: "⏸️", text: "Inactive" },
      error: { color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/20", icon: "❌", text: "Error" },
      maintenance: { color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-900/20", icon: "🔧", text: "Maintenance" },
    };

    const stateConfig = stateColors[hostingStatus.serviceState];
    return {
      icon: stateConfig.icon,
      text: stateConfig.text,
      color: stateConfig.color,
      bgColor: stateConfig.bgColor,
    };
  };

  /**
   * Handle service configuration change
   */
  const handleConfigChange = useCallback((serviceId: string, key: string, value: any) => {
    const service = defaultHostingServices.find(s => s.id === serviceId);
    if (service) {
      const newConfig = { ...service.config, [key]: value };
      onConfigChange?.(serviceId, newConfig);
    }
  }, [onConfigChange]);

  /**
   * Handle service action
   */
  const handleServiceAction = useCallback((serviceId: string, action: string) => {
    onServiceAction?.(serviceId, action);
  }, [onServiceAction]);

  /**
   * Toggle service expansion
   */
  const toggleServiceExpansion = (serviceId: string) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Checking Puter hosting availability...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Overview */}
      <BrutalistCard size="sm" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🚀</span>
              <h3 className="text-lg font-bold">Puter Hosting Controls</h3>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <span className={hostingStatus.puterAvailable ? "text-green-500" : "text-red-500"}>
                  ●
                </span>
                <span>Puter: {hostingStatus.puterAvailable ? "Available" : "Unavailable"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className={hostingStatus.authenticated ? "text-green-500" : "text-yellow-500"}>
                  ●
                </span>
                <span>Auth: {hostingStatus.authenticated ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className={hostingStatus.available ? "text-green-500" : "text-red-500"}>
                  ●
                </span>
                <span>Service: {hostingStatus.available ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {hostingStatus.available && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{hostingStatus.activeDeployments || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Deployments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
              </div>
              {hostingStatus.storageUsage && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((hostingStatus.storageUsage.used / hostingStatus.storageUsage.total) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Storage Used</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{defaultHostingServices.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Available Services</div>
              </div>
            </div>
          )}
        </div>
      </BrutalistCard>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayServices.map((service) => {
          const status = getStatusIndicator(service);
          const isSelected = selectedServiceId === service.id;
          const isExpanded = expandedService === service.id;
          const isClickable = hostingStatus.available && hostingStatus.authenticated;

          return (
            <BrutalistCard
              key={service.id}
              size="sm"
              variant={isSelected ? "success" : "default"}
              className={`transition-all hover:shadow-lg ${
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
              } ${isSelected ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => isClickable && toggleServiceExpansion(service.id)}
            >
              <div className="space-y-3">
                {/* Service Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-base flex items-center space-x-2">
                      <span>{service.name}</span>
                      {service.featured && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                          Featured
                        </span>
                      )}
                    </h4>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mt-1">
                      {service.type}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <span className="text-green-600 text-lg">✓</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleServiceExpansion(service.id);
                      }}
                      className={`text-gray-400 hover:text-gray-600 transition-colors ${
                        !isClickable ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                      disabled={!isClickable}
                    >
                      <svg
                        className={`h-4 w-4 transform transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Service Description */}
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {service.description}
                </p>

                {/* Status Indicator */}
                <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${status.bgColor}`}>
                  <span className={status.color}>{status.icon}</span>
                  <span className={`font-medium ${status.color}`}>{status.text}</span>
                </div>

                {/* Service Type Badge */}
                <div className="flex flex-wrap gap-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    service.type === 'deployment' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                    service.type === 'runtime' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    service.type === 'storage' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                    'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                  }`}>
                    {service.type}
                  </span>
                </div>

                {/* Expanded Configuration */}
                {isExpanded && isClickable && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <h5 className="font-medium text-sm">Configuration</h5>
                    
                    {/* Configuration Options */}
                    {service.config && Object.entries(service.config).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </label>
                        <input
                          type="text"
                          value={String(value)}
                          onChange={(e) => handleConfigChange(service.id, key, e.target.value)}
                          className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-20"
                          disabled={!isClickable}
                        />
                      </div>
                    ))}

                    {/* Service Actions */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleServiceAction(service.id, "restart");
                        }}
                        className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        disabled={!isClickable}
                      >
                        Restart
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleServiceAction(service.id, "configure");
                        }}
                        className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        disabled={!isClickable}
                      >
                        Configure
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleServiceAction(service.id, "logs");
                        }}
                        className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        disabled={!isClickable}
                      >
                        View Logs
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </BrutalistCard>
          );
        })}
      </div>

      {/* Help Text */}
      {!hostingStatus.puterAvailable && (
        <BrutalistCard size="sm" variant="warning">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-sm">
              Puter.js is not loaded. Make sure you're accessing this from a Puter environment.
            </p>
          </div>
        </BrutalistCard>
      )}

      {hostingStatus.puterAvailable && !hostingStatus.authenticated && (
        <BrutalistCard size="sm" variant="warning">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">🔐</span>
            <p className="text-sm">
              Authentication required. Please sign in with Puter to manage hosting services.
            </p>
          </div>
        </BrutalistCard>
      )}

      {/* Deployment Section */}
      {showDeployments && hostingStatus.available && (
        <BrutalistCard size="sm">
          <div className="space-y-3">
            <h4 className="font-bold flex items-center space-x-2">
              <span>📦</span>
              <span>Recent Deployments</span>
            </h4>
            <div className="space-y-2">
              {hostingStatus.activeDeployments && hostingStatus.activeDeployments > 0 ? (
                Array.from({ length: Math.min(hostingStatus.activeDeployments, 3) }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">●</span>
                      <span className="text-sm">App Deployment #{index + 1}</span>
                    </div>
                    <span className="text-xs text-gray-500">Active</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No active deployments</p>
              )}
            </div>
            <button
              onClick={() => handleServiceAction("deployments", "view-all")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              disabled={!hostingStatus.available}
            >
              View All Deployments →
            </button>
          </div>
        </BrutalistCard>
      )}
    </div>
  );
};

export default PuterHostingControls;