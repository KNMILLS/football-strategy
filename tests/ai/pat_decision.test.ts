import { describe, it, expect } from 'vitest';
import { COACH_PROFILES } from '../../src/ai/CoachProfiles';
import { shouldGoForTwo, performPAT } from '../../src/ai/PATDecision';

function rngConst(v: number): () => number { return () => v; }

describe('AI PAT decision', () => {
  it('goes for two when trailing by 1 or 2', () => {
    const ctx = { diff: 1, quarter: 4, clock: 120, coach: COACH_PROFILES['John Madden'] };
    expect(shouldGoForTwo(ctx)).toBe(true);
  });
  it('aggressive coach may go when up 1 late', () => {
    const ctx = { diff: -1, quarter: 4, clock: 60, coach: COACH_PROFILES['Andy Reid'] };
    expect(shouldGoForTwo(ctx)).toBe(true);
  });
  it('performPAT returns points based on decision and rng', () => {
    const ctx = { diff: 1, quarter: 4, clock: 60, coach: COACH_PROFILES['John Madden'] };
    // Two-point: rng<0.5 succeeds
    expect(performPAT(ctx, rngConst(0.4)).aiPoints).toBe(2);
    expect(performPAT(ctx, rngConst(0.6)).aiPoints).toBe(0);
    const ctx2 = { diff: 3, quarter: 2, clock: 600, coach: COACH_PROFILES['John Madden'] };
    // XP: rng < 0.98 succeeds
    expect(performPAT(ctx2, rngConst(0.5)).aiPoints).toBe(1);
    expect(performPAT(ctx2, rngConst(0.99)).aiPoints).toBe(0);
  });
});
