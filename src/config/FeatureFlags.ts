/**
 * Feature flag system for controlling engine selection and other experimental features
 */

export type EngineType = 'deterministic' | 'dice';

export interface FeatureFlags {
  // Engine selection
  engine: EngineType;

  // New engine features
  NEW_ENGINE_V1: boolean;

  // Additional flags can be added here as needed
  [key: string]: boolean | string | number;
}

/**
 * Default feature flag configuration
 */
const DEFAULT_FLAGS: FeatureFlags = {
  engine: 'deterministic', // Default to deterministic for safety
  NEW_ENGINE_V1: true, // Enable new dice engine by default in dev
};

/**
 * Get feature flag value from localStorage, then environment, then default
 */
function getFeatureFlag<T extends keyof FeatureFlags>(key: T): FeatureFlags[T] {
  // Check environment variables first (for CI/deployment control)
  const envKey = `GRIDIRON_${String(key).toUpperCase()}`;
  const envValue = process.env[envKey];

  if (envValue !== undefined) {
    if (key === 'engine') {
      return (envValue === 'dice' ? 'dice' : 'deterministic') as FeatureFlags[T];
    }
    if (typeof DEFAULT_FLAGS[key] === 'boolean') {
      return (envValue.toLowerCase() === 'true') as FeatureFlags[T];
    }
    return envValue as FeatureFlags[T];
  }

  // Check localStorage (for user preference)
  try {
    const stored = localStorage.getItem(`gridiron_feature_${key}`);
    if (stored !== null) {
      if (key === 'engine') {
        return (stored === 'dice' ? 'dice' : 'deterministic') as FeatureFlags[T];
      }
      if (typeof DEFAULT_FLAGS[key] === 'boolean') {
        return (stored === 'true') as FeatureFlags[T];
      }
      return stored as FeatureFlags[T];
    }
  } catch (error) {
    // localStorage not available, fall back to default
    console.warn('localStorage not available, using default feature flags');
  }

  return DEFAULT_FLAGS[key];
}

/**
 * Set feature flag value in localStorage
 */
export function setFeatureFlag<T extends keyof FeatureFlags>(key: T, value: FeatureFlags[T]): void {
  try {
    if (key === 'engine') {
      localStorage.setItem(`gridiron_feature_${key}`, value as string);
    } else if (typeof value === 'boolean') {
      localStorage.setItem(`gridiron_feature_${key}`, value.toString());
    } else {
      localStorage.setItem(`gridiron_feature_${key}`, String(value));
    }
  } catch (error) {
    console.warn('Failed to save feature flag to localStorage:', error);
  }
}

/**
 * Get current feature flags configuration
 */
export function getFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = { ...DEFAULT_FLAGS };

  for (const key of Object.keys(DEFAULT_FLAGS) as Array<keyof FeatureFlags>) {
    flags[key] = getFeatureFlag(key);
  }

  return flags;
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const value = getFeatureFlag(flag);
  return typeof value === 'boolean' ? value : false;
}

/**
 * Get the current engine type
 */
export function getCurrentEngine(): EngineType {
  return getFeatureFlag('engine');
}

/**
 * Set the engine type
 */
export function setEngine(engine: EngineType): void {
  setFeatureFlag('engine', engine);
}

/**
 * Check if new dice engine is enabled
 */
export function isNewEngineEnabled(): boolean {
  return isFeatureEnabled('NEW_ENGINE_V1') && getCurrentEngine() === 'dice';
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags(): void {
  try {
    const keys = Object.keys(DEFAULT_FLAGS);
    for (const key of keys) {
      localStorage.removeItem(`gridiron_feature_${key}`);
    }
  } catch (error) {
    console.warn('Failed to reset feature flags:', error);
  }
}
