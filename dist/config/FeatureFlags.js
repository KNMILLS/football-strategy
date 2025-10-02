/**
 * Feature flag system for controlling engine selection and other experimental features
 */
/**
 * Default feature flag configuration
 */
const DEFAULT_FLAGS = {
    engine: 'dice', // Default to new dice engine
    NEW_ENGINE_V1: true, // Enable new dice engine by default in dev
};
/**
 * Get feature flag value from localStorage, then environment, then default
 */
export function getFeatureFlag(key) {
    // Check environment variables first (for CI/deployment control)
    // Note: process is only available in Node.js, not in browsers
    const envKey = `GRIDIRON_${String(key).toUpperCase()}`;
    const envValue = (typeof process !== 'undefined' && process.env) ? process.env[envKey] : undefined;
    if (envValue !== undefined) {
        if (key === 'engine') {
            return (envValue === 'dice' ? 'dice' : 'deterministic');
        }
        if (typeof DEFAULT_FLAGS[key] === 'boolean') {
            return (envValue.toLowerCase() === 'true');
        }
        return envValue;
    }
    // Check localStorage (for user preference)
    try {
        const stored = localStorage.getItem(`gridiron_feature_${key}`);
        if (stored !== null) {
            if (key === 'engine') {
                return (stored === 'dice' ? 'dice' : 'deterministic');
            }
            if (typeof DEFAULT_FLAGS[key] === 'boolean') {
                return (stored === 'true');
            }
            return stored;
        }
    }
    catch (error) {
        // localStorage not available, fall back to default
        console.warn('localStorage not available, using default feature flags');
    }
    return DEFAULT_FLAGS[key];
}
/**
 * Set feature flag value in localStorage
 */
export function setFeatureFlag(key, value) {
    try {
        if (key === 'engine') {
            localStorage.setItem(`gridiron_feature_${key}`, value);
        }
        else if (typeof value === 'boolean') {
            localStorage.setItem(`gridiron_feature_${key}`, value.toString());
        }
        else {
            localStorage.setItem(`gridiron_feature_${key}`, String(value));
        }
    }
    catch (error) {
        console.warn('Failed to save feature flag to localStorage:', error);
    }
}
/**
 * Get current feature flags configuration
 */
export function getFeatureFlags() {
    const flags = { ...DEFAULT_FLAGS };
    for (const key of Object.keys(DEFAULT_FLAGS)) {
        flags[key] = getFeatureFlag(key);
    }
    return flags;
}
/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag) {
    const value = getFeatureFlag(flag);
    return typeof value === 'boolean' ? value : false;
}
/**
 * Get the current engine type
 */
export function getCurrentEngine() {
    return getFeatureFlag('engine');
}
/**
 * Get information about the current engine
 */
export function getCurrentEngineInfo() {
    const type = getCurrentEngine();
    const info = {
        deterministic: {
            name: 'Deterministic Engine',
            description: 'Legacy card-based resolution system'
        },
        dice: {
            name: 'Dice Engine',
            description: 'New 2d20 dice-based resolution system'
        }
    };
    return {
        type,
        ...info[type]
    };
}
/**
 * Set the engine type
 */
export function setEngine(engine) {
    setFeatureFlag('engine', engine);
}
/**
 * Check if new dice engine is enabled
 */
export function isNewEngineEnabled() {
    return isFeatureEnabled('NEW_ENGINE_V1') && getCurrentEngine() === 'dice';
}
/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags() {
    try {
        const keys = Object.keys(DEFAULT_FLAGS);
        for (const key of keys) {
            localStorage.removeItem(`gridiron_feature_${key}`);
        }
    }
    catch (error) {
        console.warn('Failed to reset feature flags:', error);
    }
}
//# sourceMappingURL=FeatureFlags.js.map