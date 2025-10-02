/**
 * Telemetry event types for dice engine game analysis
 * Structured data format for balance analysis and tuning
 */

export interface BaseTelemetryEvent {
  timestamp: number;
  eventId: string;
  sessionId: string;
  gameId: string;
  eventType: TelemetryEventType;
}

export type TelemetryEventType =
  | 'dice_roll'
  | 'outcome_determined'
  | 'penalty_assessed'
  | 'play_resolved'
  | 'game_state_change'
  | 'scoring_event'
  | 'time_update'
  | 'possession_change';

export interface DiceRollEvent extends BaseTelemetryEvent {
  eventType: 'dice_roll';
  playLabel: string;
  defenseLabel: string;
  deckName: string;
  diceResult: {
    d1: number;
    d2: number;
    sum: number;
    isDoubles: boolean;
  };
  chartKey?: string;
  defenseKey?: string;
}

export interface OutcomeDeterminedEvent extends BaseTelemetryEvent {
  eventType: 'outcome_determined';
  playLabel: string;
  defenseLabel: string;
  deckName: string;
  outcome: {
    category: string;
    yards?: number;
    penalty?: PenaltyOutcome;
    interceptReturn?: number;
    resultString?: string;
  };
}

export interface PenaltyAssessedEvent extends BaseTelemetryEvent {
  eventType: 'penalty_assessed';
  penaltyType: string;
  yards: number;
  spot: number;
  possessionBefore: 'player' | 'ai';
  possessionAfter?: 'player' | 'ai';
  decision?: 'accept' | 'decline';
  wasFirstDownOnPlay: boolean;
  inTwoMinute: boolean;
}

export interface PlayResolvedEvent extends BaseTelemetryEvent {
  eventType: 'play_resolved';
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
}

export interface GameStateChangeEvent extends BaseTelemetryEvent {
  eventType: 'game_state_change';
  changeType: 'field_position' | 'down_distance' | 'clock' | 'score' | 'possession';
  oldState: GameStateSnapshot;
  newState: GameStateSnapshot;
  reason?: string;
}

export interface ScoringEvent extends BaseTelemetryEvent {
  eventType: 'scoring_event';
  scoringTeam: 'player' | 'ai';
  points: number;
  scoreType: 'TD' | 'XP' | 'TwoPoint' | 'FG' | 'Safety';
  gameStateBefore: GameStateSnapshot;
  gameStateAfter: GameStateSnapshot;
}

export interface TimeUpdateEvent extends BaseTelemetryEvent {
  eventType: 'time_update';
  clockBefore: number;
  clockAfter: number;
  timeElapsed: number;
  quarter: number;
  reason?: string;
}

export interface PossessionChangeEvent extends BaseTelemetryEvent {
  eventType: 'possession_change';
  possessionBefore: 'player' | 'ai';
  possessionAfter: 'player' | 'ai';
  reason: 'turnover' | 'kickoff' | 'punt' | 'touchback' | 'safety';
  spot: number;
  down?: number;
  toGo?: number;
}

export interface PenaltyOutcome {
  penaltyType: string;
  yards: number;
  automaticFirstDown?: boolean;
  lossOfDown?: boolean;
  description?: string;
}

export interface GameStateSnapshot {
  quarter: number;
  clock: number;
  down: number;
  toGo: number;
  ballOn: number;
  possession: 'player' | 'ai';
  score: {
    player: number;
    ai: number;
  };
}

export type TelemetryEvent =
  | DiceRollEvent
  | OutcomeDeterminedEvent
  | PenaltyAssessedEvent
  | PlayResolvedEvent
  | GameStateChangeEvent
  | ScoringEvent
  | TimeUpdateEvent
  | PossessionChangeEvent;

// NDJSON export type for file serialization
export type TelemetryEventForExport = Omit<TelemetryEvent, 'timestamp'> & {
  timestamp: string; // ISO string for JSON serialization
};
