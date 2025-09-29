import { describe, it, expect } from 'vitest';
import { timeOffWithTwoMinute } from '../../src/rules/Timekeeping';

const base = { yards: 0, penalty: null, turnover: false, interceptReturn: 0, firstDown: false } as const;

describe('timeOffWithTwoMinute', () => {
  it('zeros time for incomplete and out-of-bounds in two-minute', () => {
    expect(timeOffWithTwoMinute({ ...base, category: 'incomplete' }, true, false)).toBe(0);
    expect(timeOffWithTwoMinute({ ...base, category: 'gain', outOfBounds: true, yards: 5 }, true, false)).toBe(0);
  });
  it('zeros time for first down conversions in two-minute', () => {
    expect(timeOffWithTwoMinute({ ...base, category: 'gain', yards: 7 }, true, true)).toBe(0);
  });
  it('uses normal time outside two-minute', () => {
    expect(timeOffWithTwoMinute({ ...base, category: 'gain', yards: 7 }, false, false)).toBe(30);
  });
});
