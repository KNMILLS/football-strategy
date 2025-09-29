import type { GameState } from '../domain/GameState';
import type { DeckName } from '../data/decks';

export interface ValidationContext {
  state: GameState;
  deckName: DeckName;
  whiteSignRestrictions: Record<string, number>;
}

export type PlayIssue =
  | { code: 'PUNT_NOT_4TH'; message: string }
  | { code: 'WHITE_SIGN_RESTRICTED'; message: string; requiredDistance: number; currentDistance: number }
  | { code: 'FG_OUT_OF_RANGE'; message: string; attemptYards: number }
  | { code: 'UNKNOWN_LABEL'; message: string };

export function isGoalToGo(state: GameState): boolean {
  const offenseIsPlayer = state.possession === 'player';
  const distance = offenseIsPlayer ? (100 - state.ballOn) : state.ballOn;
  return state.toGo >= distance && distance <= 10;
}

export function distanceToOpponentGoal(state: GameState): number {
  return state.possession === 'player' ? (100 - state.ballOn) : state.ballOn;
}

export function canAttemptFieldGoal(state: GameState, attemptYards: number): boolean {
  return attemptYards <= 45;
}

export function validateOffensePlay(
  ctx: ValidationContext,
  playLabel: string,
  cardType: 'run'|'pass'|'punt'|'field-goal'
): PlayIssue[] {
  const issues: PlayIssue[] = [];
  const { state, whiteSignRestrictions } = ctx;

  if (cardType === 'punt') {
    if (state.down !== 4) {
      issues.push({ code: 'PUNT_NOT_4TH', message: 'Punt is only allowed on 4th down.' });
    }
  }

  if (cardType === 'run' || cardType === 'pass') {
    const required = whiteSignRestrictions[playLabel];
    if (typeof required === 'number') {
      const dist = distanceToOpponentGoal(state);
      if (dist <= required) {
        issues.push({ code: 'WHITE_SIGN_RESTRICTED', message: 'This play is restricted near the goal line.', requiredDistance: required, currentDistance: dist });
      }
    }
  }

  if (cardType === 'field-goal') {
    const distance = distanceToOpponentGoal(state);
    const attemptYards = distance + 17; // 7 placement + 10 end zone
    if (!canAttemptFieldGoal(state, attemptYards)) {
      issues.push({ code: 'FG_OUT_OF_RANGE', message: 'Field goal attempt is out of range.', attemptYards });
    }
  }

  if (!playLabel) {
    issues.push({ code: 'UNKNOWN_LABEL', message: 'Unknown play label.' });
  }

  return issues;
}


