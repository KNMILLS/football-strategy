import { describe, it, expect } from 'vitest';
import { resolvePunt } from '../../src/rules/special/Punt';

function rngFromInts(ints: number[]): () => number { let i=0; return () => (ints[i++ % ints.length]-0.5)/6; }
function rngSeq(vals: number[]): () => number { let i=0; return () => vals[i++ % vals.length]; }

describe('resolvePunt', () => {
  it('touchback when through end zone', () => {
    // ballOn 90, distance 12 -> 52 yards → 142 > 100
    const rng = rngFromInts([6,6]);
    const out = resolvePunt({ ballOn: 90, puntingTeam: 'player' }, rng, () => 30);
    expect(out.touchback).toBe(true);
    expect(out.possessionFlips).toBe(true);
    expect(out.ballOn).toBe(80);
  });

  it('return in play with no fumble flips possession', () => {
    // distance 7 -> 43; ballOn 50 -> 93; return roll 10 -> 3 yards; retRoll>4 so no fumble check
    const rng = rngFromInts([1,6, 4,6]);
    const out = resolvePunt({ ballOn: 50, puntingTeam: 'player' }, rng, () => 30);
    expect(out.touchback).toBe(false);
    expect(out.possessionFlips).toBe(true);
    expect(out.ballOn).toBe(90); // 93 minus 3 return towards 0
  });

  it('fumble on low return roll may be recovered by kicking team', () => {
    // Use distance sum 5 -> 40; start at 59 -> 99 (in play)
    // Return sum 4 -> 15 yards; then rng<0.15 true and rng<0.5 true => fumble, kicking team recovers
    const rng = rngFromInts([2,3, 1,3, 1,3]);
    const out = resolvePunt({ ballOn: 59, puntingTeam: 'player' }, rng, () => 30);
    expect(out.touchback).toBe(false);
    expect(out.possessionFlips).toBe(false);
    expect(out.fumbleRecoveredByKickingTeam).toBe(true);
    expect(out.ballOn).toBe(84);
  });
});
