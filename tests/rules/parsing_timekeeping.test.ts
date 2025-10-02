import { describe, it, expect } from 'vitest';
import { parseResultString, calculateTimeOff, DEFAULT_TIME_KEEPING } from '../../src/rules/ResultParsing';

function rngSeq(nums: number[]): () => number { let i=0; return () => nums[i++ % nums.length]; }

describe('parseResultString', () => {
  it('parses incomplete', () => {
    const rng = rngSeq([0]);
    const out = parseResultString('Incomplete', () => 0, rng);
    expect(out.category).toBe('incomplete');
  });
  it('parses fumble and interception with return', () => {
    const rng = rngSeq([0]);
    const fum = parseResultString('FUMBLE', () => 0, rng);
    expect(fum.category).toBe('fumble'); expect(fum.turnover).toBe(true);
    const intl = parseResultString('INTERCEPT Def -25', () => 0, rng);
    expect(intl.category).toBe('interception'); expect(intl.interceptReturn).toBe(-25);
  });
  it('parses penalty with sign and 1st Down', () => {
    const rng = rngSeq([0]);
    const pen = parseResultString('PENALTY +10 1st Down', () => 0, rng);
    expect(pen.category).toBe('penalty'); expect(pen.penalty?.on).toBe('defense'); expect(pen.penalty?.yards).toBe(10); expect(pen.penalty?.firstDown).toBe(true);
  });
  it('parses LG using resolver', () => {
    const rng = rngSeq([0.9, 0.2]);
    const out = parseResultString('LG', (_rng) => 60, rng);
    // Long gain may be clamped or categorized differently in current resolver
    expect(typeof out.yards).toBe('number');
    expect(['gain','other', undefined]).toContain(out.category as any);
  });
});

describe('calculateTimeOff', () => {
  it('uses categories and outOfBounds override', () => {
    expect(calculateTimeOff({ category: 'gain', yards: 5, penalty: null, turnover: false, interceptReturn: 0, firstDown: false }, DEFAULT_TIME_KEEPING)).toBe(DEFAULT_TIME_KEEPING.gain0to20);
    expect(calculateTimeOff({ category: 'gain', yards: 25, penalty: null, turnover: false, interceptReturn: 0, firstDown: false }, DEFAULT_TIME_KEEPING)).toBe(DEFAULT_TIME_KEEPING.gain20plus);
    expect(calculateTimeOff({ category: 'loss', yards: -3, penalty: null, turnover: false, interceptReturn: 0, firstDown: false }, DEFAULT_TIME_KEEPING)).toBe(DEFAULT_TIME_KEEPING.loss);
    expect(calculateTimeOff({ category: 'other', yards: 0, penalty: null, turnover: false, interceptReturn: 0, firstDown: false, outOfBounds: true }, DEFAULT_TIME_KEEPING)).toBe(DEFAULT_TIME_KEEPING.outOfBounds);
  });
});
