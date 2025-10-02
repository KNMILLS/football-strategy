import { EventBus } from '../utils/EventBus';
import { TelemetryCollector } from './TelemetryCollector';
import { NdJsonLogger } from './NdJsonLogger';
import { PrivacyFilter } from './PrivacyFilter';
import { TelemetryConfig as ConfigClass, globalTelemetryConfig } from './TelemetryConfig';
import { initializeTelemetry } from '../rules/Charts';
/**
 * Main telemetry manager that coordinates all telemetry components
 * Provides a unified interface for telemetry collection, processing, and output
 */
export class TelemetryManager {
    eventBus;
    collector = null;
    logger = null;
    filter = null;
    config;
    isInitialized = false;
    constructor(eventBus, config) {
        this.eventBus = eventBus;
        this.config = new ConfigClass(config);
        if (this.config.isEnabled()) {
            this.initialize();
        }
    }
    /**
     * Initialize telemetry system components
     */
    initialize() {
        if (this.isInitialized)
            return;
        // Create privacy filter
        const privacyConfig = {
            mode: this.config.getPrivacyMode()
        };
        this.filter = new PrivacyFilter(privacyConfig.mode);
        // Create telemetry collector
        this.collector = new TelemetryCollector(this.eventBus, this.config);
        // Create NDJSON logger
        const loggerConfig = this.config.getNdJsonLoggerConfig();
        this.logger = new NdJsonLogger(this.config.getOutputDestination(), loggerConfig);
        // Initialize telemetry in the Charts module
        initializeTelemetry(this.eventBus);
        this.isInitialized = true;
    }
    /**
     * Start telemetry collection for a new game
     */
    async startNewGame() {
        if (!this.config.isEnabled())
            return;
        if (!this.isInitialized) {
            this.initialize();
        }
        this.collector?.startNewGame();
    }
    /**
     * Stop telemetry collection and export collected data
     */
    async stopCollection() {
        if (!this.config.isEnabled() || !this.collector)
            return;
        const events = this.collector.stopCollection();
        if (events.length > 0 && this.filter && this.logger) {
            // Apply privacy filtering
            const filteredEvents = this.filter.filterEvents(events);
            // Validate privacy compliance
            const compliance = this.filter.getComplianceReport(filteredEvents);
            if (!compliance.isCompliant) {
                console.warn('Telemetry privacy compliance issues detected:', compliance.issues);
            }
            // Log events
            await this.logger.logEvents(filteredEvents);
        }
    }
    /**
     * Get current telemetry events (for debugging)
     */
    getCurrentEvents() {
        return this.collector?.getEvents() || [];
    }
    /**
     * Update configuration and reinitialize if needed
     */
    updateConfig(newConfig) {
        const wasEnabled = this.config.isEnabled();
        this.config.updateConfig(newConfig);
        if (this.config.isEnabled() && !wasEnabled) {
            // Was disabled, now enabled - initialize
            this.initialize();
        }
        else if (!this.config.isEnabled() && wasEnabled) {
            // Was enabled, now disabled - cleanup
            this.cleanup();
        }
    }
    /**
     * Flush pending telemetry data
     */
    async flush() {
        if (this.logger) {
            await this.logger.flush();
        }
    }
    /**
     * Close telemetry system and cleanup resources
     */
    async close() {
        await this.flush();
        this.cleanup();
    }
    /**
     * Cleanup telemetry components
     */
    cleanup() {
        if (this.logger) {
            // Close logger asynchronously but don't wait
            this.logger.close().catch(console.error);
            this.logger = null;
        }
        if (this.collector) {
            this.collector.stopCollection();
            this.collector = null;
        }
        this.filter = null;
        this.isInitialized = false;
    }
    /**
     * Get privacy compliance report for current events
     */
    getComplianceReport() {
        if (!this.filter || !this.collector)
            return null;
        const events = this.collector.getEvents();
        const filteredEvents = this.filter.filterEvents(events);
        return this.filter.getComplianceReport(filteredEvents);
    }
    /**
     * Get memory output (for testing/debugging)
     */
    getMemoryOutput() {
        return this.logger?.getMemoryOutput() || '';
    }
}
/**
 * Global telemetry manager instance
 */
export const globalTelemetryManager = new TelemetryManager(
// EventBus will be injected when the app initializes
new EventBus(), globalTelemetryConfig.getConfig());
//# sourceMappingURL=TelemetryManager.js.map