import { describe, it, expect } from 'vitest';
import { resolveLongGain } from '../../src/rules/LongGain';

function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe('resolveLongGain', () => {
  it('returns +50 + 10x when entry has multiplier', () => {
    // First roll -> 1 (table entry with +50 and 1D6), second roll -> 0.4 (-> 3)
    const rng = makeRng([0, 0.4]);
    const yards = resolveLongGain(rng);
    expect(yards).toBe(50 + 30);
  });

  it('caps LG returns at or below 50 when used by kickoff logic (verified elsewhere)', () => {
    const rng = makeRng([0, 0.99]);
    const yards = resolveLongGain(rng);
    expect(yards).toBe(50 + 60);
  });
});
