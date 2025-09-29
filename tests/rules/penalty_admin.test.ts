import { describe, it, expect } from 'vitest';
import type { GameState } from '../../src/domain/GameState';
import { administerPenalty } from '../../src/rules/PenaltyAdmin';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 1,
    quarter: 1,
    clock: 15 * 60,
    down: 2,
    toGo: 8,
    ballOn: 40,
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 0, ai: 0 },
    ...overrides,
  };
}

describe('PenaltyAdmin', () => {
  it('defensive +10 with 1st Down resets to goal-to-go with half-distance cap', () => {
    const pre = baseState({ ballOn: 95, toGo: 5, down: 3 });
    const post = pre; // no play applied
    const outcome = { yards: 0, penalty: { on: 'defense' as const, yards: 10, firstDown: true }, turnover: false, interceptReturn: 0, firstDown: false, category: 'penalty' as const };
    const res = administerPenalty({ prePlayState: pre, postPlayState: post, offenseGainedYards: 0, outcome, inTwoMinute: false, wasFirstDownOnPlay: false });
    expect(res.adminMeta.automaticFirstDownApplied).toBe(true);
    expect(res.adminMeta.halfDistanceCapped).toBe(true);
    expect(res.accepted.down).toBe(1);
    expect(res.accepted.toGo).toBe(3); // goal-to-go inside 10 (distance to goal from 97)
    expect(res.accepted.ballOn).toBe(97); // half the distance from 95 (5/2 floored -> +2)
  });

  it('offensive -10 accepted vs declined computes hint reasonably', () => {
    const pre = baseState({ ballOn: 50, down: 2, toGo: 10 });
    const post = pre;
    const outcome = { yards: 0, penalty: { on: 'offense' as const, yards: 10 }, turnover: false, interceptReturn: 0, firstDown: false, category: 'penalty' as const };
    const res = administerPenalty({ prePlayState: pre, postPlayState: post, offenseGainedYards: 7, outcome, inTwoMinute: false, wasFirstDownOnPlay: false });
    expect(res.accepted.ballOn).toBe(40);
    expect(res.accepted.down).toBe(2);
    expect(res.accepted.toGo).toBe(10);
    // With no play yardage applied (post==pre), declining yields same spot; generally accept is worse → hint decline or neutral
    expect(['decline', 'neutral']).toContain(res.decisionHint);
  });

  it('long gain special measures from midfield and caps half distance', () => {
    const pre = baseState({ ballOn: 30 });
    const post = pre;
    const outcome = { yards: 0, penalty: { on: 'defense' as const, yards: 20 }, turnover: false, interceptReturn: 0, firstDown: false, category: 'penalty' as const, raw: 'LG PENALTY +20' } as const;
    const res = administerPenalty({ prePlayState: pre, postPlayState: post, offenseGainedYards: 0, outcome, inTwoMinute: false, wasFirstDownOnPlay: false });
    // From midfield 50 towards player offense goal at 100 → +20 to 70
    expect(res.adminMeta.measuredFromMidfieldForLG).toBe(true);
    expect(res.adminMeta.spotBasis).toBe('midfield');
    expect(res.accepted.ballOn).toBe(70);
  });

  it('defensive penalty at 0:00 in Q4 schedules untimed down and no time off', () => {
    const pre = baseState({ quarter: 4, clock: 0, ballOn: 40 });
    const post = pre;
    const outcome = { yards: 0, penalty: { on: 'defense' as const, yards: 5 }, turnover: false, interceptReturn: 0, firstDown: false, category: 'penalty' as const };
    const res = administerPenalty({ prePlayState: pre, postPlayState: post, offenseGainedYards: 0, outcome, inTwoMinute: false, wasFirstDownOnPlay: false });
    expect(res.adminMeta.untimedDownScheduled).toBe(true);
    expect(res.accepted.clock).toBe(0);
  });

  it('half-the-distance applies near own goal for offensive penalties', () => {
    const pre = baseState({ ballOn: 3 });
    const post = pre;
    const outcome = { yards: 0, penalty: { on: 'offense' as const, yards: 10 }, turnover: false, interceptReturn: 0, firstDown: false, category: 'penalty' as const };
    const res = administerPenalty({ prePlayState: pre, postPlayState: post, offenseGainedYards: 0, outcome, inTwoMinute: false, wasFirstDownOnPlay: false });
    // Against offense from own 3: half distance to defense goal (towards 0) is 1 → to 2
    expect(res.adminMeta.halfDistanceCapped).toBe(true);
    expect(res.accepted.ballOn).toBe(2);
  });
});


