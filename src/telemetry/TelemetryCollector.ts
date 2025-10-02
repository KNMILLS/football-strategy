import { EventBus } from '../utils/EventBus';
import type {
  TelemetryEvent,
  DiceRollEvent,
  OutcomeDeterminedEvent,
  PenaltyAssessedEvent,
  PlayResolvedEvent,
  GameStateChangeEvent,
  ScoringEvent,
  TimeUpdateEvent,
  PossessionChangeEvent,
  GameStateSnapshot
} from './TelemetrySchema';

/**
 * Runtime telemetry event collector
 * Captures dice rolls, outcomes, and game events for balance analysis
 */
export class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private sessionId: string;
  private gameId: string;
  private eventCounter = 0;
  private isEnabled = false;

  constructor(
    private eventBus: EventBus,
    private config: TelemetryConfig
  ) {
    this.sessionId = this.generateSessionId();
    this.gameId = this.generateGameId();
    this.isEnabled = config.isEnabled();
  }

  /**
   * Initialize telemetry collection for a new game
   */
  startNewGame(): void {
    if (!this.isEnabled) return;

    this.gameId = this.generateGameId();
    this.eventCounter = 0;
    this.events = [];

    // Subscribe to relevant events from EventBus
    this.setupEventListeners();
  }

  /**
   * Stop telemetry collection and return collected events
   */
  stopCollection(): TelemetryEvent[] {
    if (!this.isEnabled) return [];

    this.cleanupEventListeners();
    return [...this.events];
  }

  /**
   * Record a dice roll event
   */
  recordDiceRoll(params: {
    playLabel: string;
    defenseLabel: string;
    deckName: string;
    diceResult: { d1: number; d2: number; sum: number; isDoubles: boolean };
    chartKey?: string;
    defenseKey?: string;
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return; // Silently drop events beyond limit
    }

    const event: DiceRollEvent = {
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
  recordOutcomeDetermined(params: {
    playLabel: string;
    defenseLabel: string;
    deckName: string;
    outcome: {
      category: string;
      yards?: number;
      penalty?: any;
      interceptReturn?: number;
      resultString?: string;
    };
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: OutcomeDeterminedEvent = {
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
  recordPenaltyAssessed(params: {
    penaltyType: string;
    yards: number;
    spot: number;
    possessionBefore: 'player' | 'ai';
    possessionAfter?: 'player' | 'ai';
    decision?: 'accept' | 'decline';
    wasFirstDownOnPlay: boolean;
    inTwoMinute: boolean;
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: PenaltyAssessedEvent = {
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
  recordPlayResolved(params: {
    playLabel: string;
    defenseLabel: string;
    deckName: string;
    gameStateBefore: GameStateSnapshot;
    gameStateAfter: GameStateSnapshot;
    outcome: {
      category: string;
      yards?: number;
      touchdown: boolean;
      safety: boolean;
      possessionChanged: boolean;
    };
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: PlayResolvedEvent = {
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
  recordGameStateChange(params: {
    changeType: 'field_position' | 'down_distance' | 'clock' | 'score' | 'possession';
    oldState: GameStateSnapshot;
    newState: GameStateSnapshot;
    reason?: string;
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: GameStateChangeEvent = {
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
  recordScoringEvent(params: {
    scoringTeam: 'player' | 'ai';
    points: number;
    scoreType: 'TD' | 'XP' | 'TwoPoint' | 'FG' | 'Safety';
    gameStateBefore: GameStateSnapshot;
    gameStateAfter: GameStateSnapshot;
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: ScoringEvent = {
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
  recordTimeUpdate(params: {
    clockBefore: number;
    clockAfter: number;
    timeElapsed: number;
    quarter: number;
    reason?: string;
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: TimeUpdateEvent = {
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
  recordPossessionChange(params: {
    possessionBefore: 'player' | 'ai';
    possessionAfter: 'player' | 'ai';
    reason: 'turnover' | 'kickoff' | 'punt' | 'touchback' | 'safety';
    spot: number;
    down?: number;
    toGo?: number;
  }): void {
    if (!this.isEnabled) return;

    // Check max events limit
    if (this.config.getMaxEvents && this.events.length >= this.config.getMaxEvents()) {
      return;
    }

    const event: PossessionChangeEvent = {
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
  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  /**
   * Clear collected events (for testing)
   */
  clearEvents(): void {
    this.events = [];
    this.eventCounter = 0;
  }

  private setupEventListeners(): void {
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

  private cleanupEventListeners(): void {
    // Event listeners are managed by EventBus, no explicit cleanup needed
    // unless we want to unsubscribe specific listeners
  }

  private generateSessionId(): string {
    // Deterministic, monotonic identifier without Math.random
    return `session_${Date.now()}_${this.eventCounter}`;
  }

  private generateGameId(): string {
    // Deterministic, monotonic identifier without Math.random
    return `game_${Date.now()}_${this.eventCounter}`;
  }

  private generateEventId(): string {
    return `evt_${this.eventCounter++}_${Date.now()}`;
  }
}

/**
 * Configuration interface for telemetry system
 */
export interface TelemetryConfig {
  isEnabled(): boolean;
  getLogLevel(): 'off' | 'debug' | 'production';
  getMaxEvents?(): number;
  getBatchSize?(): number;
}
