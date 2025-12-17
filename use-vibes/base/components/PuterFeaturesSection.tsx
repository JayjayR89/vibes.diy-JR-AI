import * as React from 'react';
import { PuterFeatureManager } from '../../../src/PuterFeatureManager.js';
import { combineClasses, defaultClasses } from '../utils/style-utils.js';
import { imgGenStyles, imgGenTheme } from '../utils/styles.js';

interface PuterFeaturesSectionProps {
  /** Custom CSS classes for styling component parts */
  readonly classes?: Partial<PuterFeaturesClasses>;
  /** Whether to show feature controls (defaults to true) */
  readonly showControls?: boolean;
  /** Custom feature manager instance (optional) */
  readonly featureManager?: PuterFeatureManager;
}

interface PuterFeaturesClasses {
  /** Container for the entire features section */
  container: string;
  /** Individual feature card */
  featureCard: string;
  /** Feature card header */
  featureHeader: string;
  /** Feature name text */
  featureName: string;
  /** Feature description text */
  featureDescription: string;
  /** Status indicator container */
  statusIndicator: string;
  /** Control buttons container */
  controls: string;
  /** Enable/disable button */
  controlButton: string;
  /** Grid container for feature cards */
  featuresGrid: string;
}

/**
 * PuterFeaturesSection component - Displays available Puter features in a dedicated section
 * with feature cards, status indicators, and basic controls for managing feature states.
 */
export function PuterFeaturesSection({
  classes = defaultClasses,
  showControls = true,
  featureManager,
}: PuterFeaturesSectionProps) {
  // Create or use provided feature manager
  const managerRef = React.useRef<PuterFeatureManager>(
    featureManager || new PuterFeatureManager()
  );
  const manager = managerRef.current;

  // State for features and loading
  const [features, setFeatures] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load features on mount
  React.useEffect(() => {
    const loadFeatures = async () => {
      try {
        setLoading(true);
        setError(null);

        // Discover available features
        const availableFeatureIds = await manager.discoverAvailableFeatures();

        // Get all registered features (including those not available)
        const allFeatures = manager.getAllFeatures();

        // Combine with availability info
        const featuresWithAvailability = allFeatures.map(feature => ({
          ...feature,
          available: manager.isFeatureAvailable(feature.id),
          state: manager.getFeatureState(feature.id),
        }));

        // If no registered features but we have available ones, register them
        if (allFeatures.length === 0 && availableFeatureIds.length > 0) {
          availableFeatureIds.forEach(id => {
            manager.registerFeature({
              id,
              name: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
              description: `Puter ${id} feature`,
              enabled: false,
            });
          });
          // Reload features after registration
          const updatedFeatures = manager.getAllFeatures().map(feature => ({
            ...feature,
            available: manager.isFeatureAvailable(feature.id),
            state: manager.getFeatureState(feature.id),
          }));
          setFeatures(updatedFeatures);
        } else {
          setFeatures(featuresWithAvailability);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load features');
      } finally {
        setLoading(false);
      }
    };

    loadFeatures();
  }, [manager]);

  // Handle feature state toggle
  const handleToggleFeature = async (featureId: string) => {
    try {
      const currentState = manager.getFeatureState(featureId);
      const newState = !currentState;

      if (newState) {
        // Enable feature - initialize if available
        if (manager.isFeatureAvailable(featureId)) {
          await manager.initializeFeature(featureId);
        } else {
          throw new Error(`Feature '${featureId}' is not available`);
        }
      } else {
        // Disable feature
        manager.setFeatureState(featureId, false);
      }

      // Update local state
      setFeatures(prev =>
        prev.map(feature =>
          feature.id === featureId
            ? { ...feature, state: newState }
            : feature
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle feature');
    }
  };

  // Get status color based on availability and state
  const getStatusColor = (available: boolean, enabled: boolean) => {
    if (!available) return imgGenTheme.colors.errorBorder;
    if (enabled) return imgGenTheme.colors.accent;
    return imgGenTheme.colors.mutedText;
  };

  // Get status text
  const getStatusText = (available: boolean, enabled: boolean) => {
    if (!available) return 'Unavailable';
    if (enabled) return 'Enabled';
    return 'Disabled';
  };

  if (loading) {
    return (
      <div
        className={combineClasses(classes.container)}
        style={{
          padding: imgGenTheme.dimensions.padding,
          textAlign: 'center',
          color: imgGenTheme.colors.text,
        }}
      >
        Loading Puter features...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={combineClasses(classes.container)}
        style={{
          ...imgGenStyles.error,
          margin: imgGenTheme.dimensions.padding,
        }}
      >
        <div style={imgGenStyles.errorTitle}>Error Loading Features</div>
        <div style={imgGenStyles.errorMessage}>{error}</div>
      </div>
    );
  }

  return (
    <div
      className={combineClasses(classes.container)}
      style={{
        padding: imgGenTheme.dimensions.padding,
        backgroundColor: imgGenTheme.colors.background,
        borderRadius: imgGenTheme.dimensions.borderRadius,
        margin: imgGenTheme.dimensions.padding,
      }}
    >
      <h3
        style={{
          margin: '0 0 1rem 0',
          color: imgGenTheme.colors.titleText,
          fontSize: '1.2rem',
          fontWeight: 'bold',
        }}
      >
        Puter Features
      </h3>

      <div
        className={combineClasses(classes.featuresGrid)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {features.map(feature => (
          <div
            key={feature.id}
            className={combineClasses(classes.featureCard)}
            style={{
              backgroundColor: imgGenTheme.colors.inputBg,
              border: `1px solid ${imgGenTheme.colors.inputBorder}`,
              borderRadius: imgGenTheme.dimensions.borderRadius,
              padding: imgGenTheme.dimensions.padding,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              className={combineClasses(classes.featureHeader)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h4
                className={combineClasses(classes.featureName)}
                style={{
                  margin: 0,
                  color: imgGenTheme.colors.titleText,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                }}
              >
                {feature.name}
              </h4>

              <div
                className={combineClasses(classes.statusIndicator)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(feature.available, feature.state),
                  }}
                />
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: imgGenTheme.colors.mutedText,
                  }}
                >
                  {getStatusText(feature.available, feature.state)}
                </span>
              </div>
            </div>

            <p
              className={combineClasses(classes.featureDescription)}
              style={{
                margin: 0,
                color: imgGenTheme.colors.text,
                fontSize: '0.9rem',
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {feature.description}
            </p>

            {showControls && (
              <div
                className={combineClasses(classes.controls)}
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  className={combineClasses('puter-feature-button', classes.controlButton)}
                  onClick={() => handleToggleFeature(feature.id)}
                  disabled={!feature.available}
                  style={{
                    ...imgGenStyles.button,
                    backgroundColor: feature.state
                      ? imgGenTheme.colors.errorBorder
                      : imgGenTheme.colors.accent,
                    color: 'white',
                    opacity: feature.available ? 1 : 0.5,
                    cursor: feature.available ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                  }}
                >
                  {feature.state ? 'Disable' : 'Enable'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {features.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: imgGenTheme.colors.mutedText,
            padding: '2rem',
          }}
        >
          No Puter features available
        </div>
      )}
    </div>
  );
}