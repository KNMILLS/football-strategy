/**
 * Configuration system for telemetry logging
 * Controls enablement, logging levels, and environment-specific settings
 */
export class TelemetryConfig {
    config;
    constructor(config = {}) {
        // Default configuration
        this.config = {
            enabled: false,
            logLevel: 'off',
            outputDestination: 'console',
            privacyMode: 'production',
            maxEventsPerGame: 10000,
            batchSize: 100,
            flushInterval: 5000,
            fileName: `telemetry_${Date.now()}.ndjson`,
            enableSessionTracking: true,
            customFilters: [],
            ...this.getEnvironmentDefaults(),
            ...config
        };
    }
    /**
     * Check if telemetry is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Get current log level
     */
    getLogLevel() {
        return this.config.logLevel;
    }
    /**
     * Get output destination
     */
    getOutputDestination() {
        return this.config.outputDestination;
    }
    /**
     * Get privacy mode
     */
    getPrivacyMode() {
        return this.config.privacyMode;
    }
    /**
     * Get maximum events per game (for memory management)
     */
    getMaxEventsPerGame() {
        return this.config.maxEventsPerGame || 10000;
    }
    /**
     * Get maximum events per game (alias for compatibility)
     */
    getMaxEvents() {
        return this.getMaxEventsPerGame();
    }
    /**
     * Get batch size for processing
     */
    getBatchSize() {
        return this.config.batchSize || 100;
    }
    /**
     * Get flush interval for batching
     */
    getFlushInterval() {
        return this.config.flushInterval || 5000;
    }
    /**
     * Get file name for file output
     */
    getFileName() {
        return this.config.fileName || `telemetry_${Date.now()}.ndjson`;
    }
    /**
     * Check if session tracking is enabled
     */
    isSessionTrackingEnabled() {
        return this.config.enableSessionTracking !== false;
    }
    /**
     * Get custom filters
     */
    getCustomFilters() {
        return this.config.customFilters || [];
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Enable telemetry with specific settings
     */
    enable(config = {}) {
        this.config.enabled = true;
        this.updateConfig(config);
    }
    /**
     * Disable telemetry
     */
    disable() {
        this.config.enabled = false;
        this.config.logLevel = 'off';
    }
    /**
     * Set log level
     */
    setLogLevel(level) {
        this.config.logLevel = level;
        if (level === 'off') {
            this.config.enabled = false;
        }
        else {
            this.config.enabled = true;
        }
    }
    /**
     * Set output destination
     */
    setOutputDestination(destination) {
        this.config.outputDestination = destination;
    }
    /**
     * Set privacy mode
     */
    setPrivacyMode(mode) {
        this.config.privacyMode = mode;
    }
    /**
     * Get configuration for NDJSON logger
     */
    getNdJsonLoggerConfig() {
        return {
            logLevel: this.config.logLevel,
            fileName: this.config.fileName,
            enableBatching: this.config.outputDestination === 'file',
            flushInterval: this.config.flushInterval,
        };
    }
    /**
     * Get the complete configuration object
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Create configuration from environment variables
     */
    static fromEnvironment() {
        const env = typeof process !== 'undefined' ? process.env : {};
        const config = {};
        // Check for telemetry enablement
        if (env.TELEMETRY_ENABLED === 'true') {
            config.enabled = true;
        }
        else if (env.TELEMETRY_ENABLED === 'false') {
            config.enabled = false;
        }
        // Check for log level
        if (env.TELEMETRY_LOG_LEVEL) {
            const level = env.TELEMETRY_LOG_LEVEL.toLowerCase();
            if (['off', 'debug', 'production'].includes(level)) {
                config.logLevel = level;
            }
        }
        // Check for output destination
        if (env.TELEMETRY_OUTPUT) {
            const output = env.TELEMETRY_OUTPUT.toLowerCase();
            if (['console', 'file', 'memory'].includes(output)) {
                config.outputDestination = output;
            }
        }
        // Check for privacy mode
        if (env.TELEMETRY_PRIVACY_MODE) {
            const mode = env.TELEMETRY_PRIVACY_MODE.toLowerCase();
            if (['development', 'production'].includes(mode)) {
                config.privacyMode = mode;
            }
        }
        // Check for max events
        if (env.TELEMETRY_MAX_EVENTS) {
            const maxEvents = parseInt(env.TELEMETRY_MAX_EVENTS, 10);
            if (!isNaN(maxEvents) && maxEvents > 0) {
                config.maxEventsPerGame = maxEvents;
            }
        }
        // Check for batch size
        if (env.TELEMETRY_BATCH_SIZE) {
            const batchSize = parseInt(env.TELEMETRY_BATCH_SIZE, 10);
            if (!isNaN(batchSize) && batchSize > 0) {
                config.batchSize = batchSize;
            }
        }
        // Check for flush interval
        if (env.TELEMETRY_FLUSH_INTERVAL) {
            const flushInterval = parseInt(env.TELEMETRY_FLUSH_INTERVAL, 10);
            if (!isNaN(flushInterval) && flushInterval > 0) {
                config.flushInterval = flushInterval;
            }
        }
        return new TelemetryConfig(config);
    }
    /**
     * Get default configuration based on environment
     */
    getEnvironmentDefaults() {
        // In development, enable by default
        const isDevelopment = typeof process !== 'undefined' &&
            (process.env.NODE_ENV === 'development' || process.env.VITEST);
        if (isDevelopment) {
            return {
                enabled: true,
                logLevel: 'debug',
                privacyMode: 'development'
            };
        }
        // In production, disabled by default
        return {
            enabled: false,
            logLevel: 'off',
            privacyMode: 'production'
        };
    }
}
/**
 * Global telemetry configuration instance
 */
export const globalTelemetryConfig = TelemetryConfig.fromEnvironment();
//# sourceMappingURL=TelemetryConfig.js.map