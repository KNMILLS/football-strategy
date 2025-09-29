import { describe, it, expect } from 'vitest';
import { attemptPAT, attemptFieldGoal } from '../../src/rules/special/PlaceKicking';

function rngFromInts(ints: number[]): () => number { let i=0; return () => (ints[i++ % ints.length]-0.5)/6; }

describe('place kicking', () => {
  it('PAT success based on 2D6 table', () => {
    // roll 3 => PAT: G
    const rng = rngFromInts([1,2]);
    expect(attemptPAT(rng)).toBe(true);
    // roll 2 => PAT: NG
    const rng2 = rngFromInts([1,1]);
    expect(attemptPAT(rng2)).toBe(false);
  });

  it('Field goal success columns by attempt distance', () => {
    // 20 yards attempt -> col 13-22; use roll 12 -> NG for 13-22? In table, 12: G for 13-22
    let rng = rngFromInts([6,6]);
    expect(attemptFieldGoal(rng, 20)).toBe(true);
    // 46 yards attempt -> out of range
    rng = rngFromInts([6,6]);
    expect(attemptFieldGoal(rng, 46)).toBe(false);
  });
});
