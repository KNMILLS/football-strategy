import { describe, it, expect } from 'vitest';
import { validateOffensePlay, canAttemptFieldGoal, distanceToOpponentGoal } from '../../src/rules/PlayValidation';
import type { GameState } from '../../src/domain/GameState';

function baseState(): GameState {
  return { seed: 1, quarter: 1, clock: 900, down: 1, toGo: 10, ballOn: 50, possession: 'player', awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } };
}

const WHITE = { 'Long Bomb': 5, 'Run & Pass Option': 2 } as Record<string, number>;

describe('PlayValidation', () => {
  it('blocks punt when not 4th', () => {
    const state = baseState();
    const issues = validateOffensePlay({ state, deckName: 'Pro Style', whiteSignRestrictions: WHITE }, 'Punt (4th Down Only)', 'punt');
    expect(issues.find(i => i.code === 'PUNT_NOT_4TH')).toBeTruthy();
  });

  it('white-sign restriction blocks at/inside threshold; allows outside', () => {
    const state = { ...baseState(), ballOn: 96 } as GameState; // 4 yards to goal
    const issues = validateOffensePlay({ state, deckName: 'Pro Style', whiteSignRestrictions: WHITE }, 'Long Bomb', 'pass');
    expect(issues.find(i => i.code === 'WHITE_SIGN_RESTRICTED')).toBeTruthy();
    const okState = { ...baseState(), ballOn: 94 } as GameState; // 6 yards to goal
    const ok = validateOffensePlay({ state: okState, deckName: 'Pro Style', whiteSignRestrictions: WHITE }, 'Long Bomb', 'pass');
    expect(ok.length).toBe(0);
  });

  it('FG range: out of range blocked; within allowed', () => {
    const far = { ...baseState(), ballOn: 30 } as GameState; // attempt 87 -> out
    const farIssues = validateOffensePlay({ state: far, deckName: 'Pro Style', whiteSignRestrictions: {} }, 'Field Goal', 'field-goal');
    expect(farIssues.find(i => i.code === 'FG_OUT_OF_RANGE')).toBeTruthy();

    const near = { ...baseState(), ballOn: 80 } as GameState; // attempt 37 -> in range
    const nearAttempt = distanceToOpponentGoal(near) + 17;
    expect(canAttemptFieldGoal(near, nearAttempt)).toBe(true);
    const nearIssues = validateOffensePlay({ state: near, deckName: 'Pro Style', whiteSignRestrictions: {} }, 'Field Goal', 'field-goal');
    expect(nearIssues.length).toBe(0);
  });
});


