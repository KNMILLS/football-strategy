import { describe, it, expect } from 'vitest';
import { resolveKickoff, parseKickoffYardLine } from '../../src/rules/special/Kickoff';

function makeRngFromInts(ints: number[]): () => number {
  // map each int to uniform in [0,1): 1->0,2->~0.16 etc; but easier: provide exact die results
  let i = 0;
  return () => {
    const next = ints[i++ % ints.length];
    // convert 1..6 to ranges mapping floor(r*6)+1 = n -> pick mid of bucket
    return (next - 0.5) / 6;
  };
}

describe('kickoff', () => {
  it('onside +1 when leading/tied and turnover when kicker recovers', () => {
    const rng = makeRngFromInts([6]); // will become 6 -> with +1 capped at 6
    const res = resolveKickoff(rng, { onside: true, kickerLeadingOrTied: true });
    expect(res.turnover).toBe(false);
    expect(res.yardLine).toBe(30);
  });

  it('normal kickoff reroll with penalty offsets', () => {
    // First 2D6 -> 3 (PENALTY -10*), reroll 2D6 -> 7 (25)
    const rng = makeRngFromInts([1,2, 3,4]);
    const res = resolveKickoff(rng, { onside: false, kickerLeadingOrTied: false });
    expect(res.yardLine).toBe(25 - 10); // penalty applied
    expect(res.turnover).toBe(false);
  });

  it('LG yard line via long gain table capped at 50', () => {
    // First 2D6 -> 12 -> 'LG + 5'; Long gain first roll 6 => +30, +5 => 35 (<= 50)
    const rng = makeRngFromInts([6,6,6]);
    const res = resolveKickoff(rng, { onside: false, kickerLeadingOrTied: false });
    expect(res.yardLine).toBe(35);
  });
});
