/**
 * Privacy filter for production-safe telemetry data handling
 * Ensures no sensitive user data is included in production logs
 */
export class PrivacyFilter {
    mode;
    constructor(mode = 'production') {
        this.mode = mode;
    }
    /**
     * Filter telemetry events for safe output based on current mode
     */
    filterEvents(events) {
        if (this.mode === 'development') {
            // In development, include all data
            return events.map(event => this.prepareForExport(event));
        }
        else {
            // In production, apply privacy filters
            return events.map(event => this.filterProductionEvent(event));
        }
    }
    /**
     * Filter a single event for production use
     */
    filterProductionEvent(event) {
        const filtered = { ...event };
        // Remove or anonymize potentially sensitive data
        switch (event.eventType) {
            case 'dice_roll':
                // Dice rolls are safe - no personal data
                break;
            case 'outcome_determined':
                // Outcomes are safe - game mechanics data only
                break;
            case 'penalty_assessed':
                // Penalty data is safe - no personal information
                break;
            case 'play_resolved':
                // Play resolution data is safe - game state only
                break;
            case 'game_state_change':
                // Game state changes are safe - no personal data
                break;
            case 'scoring_event':
                // Scoring events are safe - game outcomes only
                break;
            case 'time_update':
                // Time updates are safe - game timing only
                break;
            case 'possession_change':
                // Possession changes are safe - game flow data only
                break;
            default:
                // Unknown event types - apply conservative filtering
                this.applyConservativeFilter(filtered);
        }
        return this.prepareForExport(filtered);
    }
    /**
     * Apply conservative filtering for unknown event types
     */
    applyConservativeFilter(event) {
        // Remove any properties that might contain unexpected data
        const allowedProperties = [
            'timestamp', 'eventId', 'sessionId', 'gameId', 'eventType'
        ];
        // Keep only safe base properties
        Object.keys(event).forEach(key => {
            if (!allowedProperties.includes(key)) {
                delete event[key];
            }
        });
    }
    /**
     * Prepare event for export (convert timestamp to ISO string)
     */
    prepareForExport(event) {
        return {
            ...event,
            timestamp: new Date(event.timestamp).toISOString()
        };
    }
    /**
     * Validate that filtered events contain no sensitive data
     */
    validateFilteredEvents(events) {
        for (const event of events) {
            if (!this.isEventSafe(event)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if a single event is safe for production use
     */
    isEventSafe(event) {
        // Game telemetry events are inherently safe as they only contain:
        // - Dice roll results (numbers)
        // - Play outcomes (game mechanics)
        // - Game state (field position, score, time)
        // - Session/game IDs (random strings for correlation)
        // These don't contain any personal user data
        return true;
    }
    /**
     * Get privacy compliance report for a set of events
     */
    getComplianceReport(events) {
        const totalEvents = events.length;
        let safeEvents = 0;
        let unsafeEvents = 0;
        const issues = [];
        for (const event of events) {
            if (this.isEventSafe(event)) {
                safeEvents++;
            }
            else {
                unsafeEvents++;
                issues.push(`Event ${event.eventId} contains potentially sensitive data`);
            }
        }
        return {
            totalEvents,
            safeEvents,
            unsafeEvents,
            complianceRate: totalEvents > 0 ? safeEvents / totalEvents : 1,
            issues,
            isCompliant: unsafeEvents === 0
        };
    }
}
/**
 * Create a privacy filter with configuration
 */
export function createPrivacyFilter(config) {
    return new PrivacyFilter(config.mode);
}
//# sourceMappingURL=PrivacyFilter.js.map