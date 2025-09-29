import { describe, it, expect } from 'vitest';
import { maybePenalty } from '../../src/rules/Penalties';

function rngConst(v: number): () => number { return () => v; }

describe('maybePenalty', () => {
  it('returns null when rng>=0.1', () => {
    const rng = rngConst(0.5);
    expect(maybePenalty(rng)).toBeNull();
  });
  it('returns penalty with on and yards when triggered', () => {
    // First <0.1 triggers, then <0.5 offense, then <0.5 5 yards
    let seq = [0.05, 0.2, 0.2]; let i=0; const rng = () => seq[i++];
    const p = maybePenalty(rng);
    expect(p).not.toBeNull();
    expect(p!.on).toBe('offense');
    expect(p!.yards).toBe(5);
  });
});
