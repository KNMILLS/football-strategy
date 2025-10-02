import { EventBus } from '../utils/EventBus';
/**
 * Runtime telemetry event collector
 * Captures dice rolls, outcomes, and game events for balance analysis
 */
export class TelemetryCollector {
    eventBus;
    config;
    events = [];
    sessionId;
    gameId;
    eventCounter = 0;
    isEnabled = false;
    constructor(eventBus, config) {
        this.eventBus = eventBus;
        this.config = config;
        this.sessionId = this.generateSessionId();
        this.gameId = this.generateGameId();
        this.isEnabled = config.isEnabled();
    }
    /**
     * Initialize telemetry collection for a new game
     */
    startNewGame() {
        if (!this.isEnabled)
            return;
        this.gameId = this.generateGameId();
        this.eventCounter = 0;
        this.events = [];
        // Subscribe to relevant events from EventBus
        this.setupEventListeners();
    }
    /**
     * Stop telemetry collection and return collected events
     */
    stopCollection() {
        if (!this.isEnabled)
            return [];
        this.cleanupEventListeners();
        return [...this.events];
    }
    /**
     * Record a dice roll event
     */
    recordDiceRoll(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return; // Silently drop events beyond limit
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'dice_roll',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record an outcome determination event
     */
    recordOutcomeDetermined(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'outcome_determined',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record a penalty assessment event
     */
    recordPenaltyAssessed(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'penalty_assessed',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record a play resolution event
     */
    recordPlayResolved(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'play_resolved',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record a game state change event
     */
    recordGameStateChange(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'game_state_change',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record a scoring event
     */
    recordScoringEvent(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'scoring_event',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record a time update event
     */
    recordTimeUpdate(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'time_update',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Record a possession change event
     */
    recordPossessionChange(params) {
        if (!this.isEnabled)
            return;
        // Check max events limit
        if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
            return;
        }
        const event = {
            timestamp: Date.now(),
            eventId: this.generateEventId(),
            sessionId: this.sessionId,
            gameId: this.gameId,
            eventType: 'possession_change',
            ...params
        };
        this.events.push(event);
    }
    /**
     * Get current collected events (for debugging/testing)
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Clear collected events (for testing)
     */
    clearEvents() {
        this.events = [];
        this.eventCounter = 0;
    }
    setupEventListeners() {
        // Listen for UI dice result events to capture dice rolls
        this.eventBus.on('ui:diceResult', (payload) => {
            this.recordDiceRoll({
                playLabel: payload.outcome?.playLabel || 'unknown',
                defenseLabel: payload.outcome?.defenseLabel || 'unknown',
                deckName: payload.outcome?.deckName || 'unknown',
                diceResult: payload.diceResult,
                chartKey: payload.outcome?.chartKey,
                defenseKey: payload.outcome?.defenseKey
            });
        });
        // Listen for play resolution events
        this.eventBus.on('playResolved', (payload) => {
            // This would need to be enhanced based on actual play resolution events
            // For now, we'll capture it when we integrate with the resolver
        });
    }
    cleanupEventListeners() {
        // Event listeners are managed by EventBus, no explicit cleanup needed
        // unless we want to unsubscribe specific listeners
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateEventId() {
        return `evt_${this.eventCounter++}_${Date.now()}`;
    }
}
//# sourceMappingURL=TelemetryCollector.js.map