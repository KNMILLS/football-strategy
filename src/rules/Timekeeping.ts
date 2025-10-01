import { DEFAULT_TIME_KEEPING, calculateTimeOff } from './ResultParsing';
import type { TimeKeeping } from '../data/schemas/Timekeeping';
import type { Outcome } from './ResultParsing';

export function timeOffWithTwoMinute(outcome: Outcome, inTwoMinute: boolean, wasFirstDown: boolean, tk: TimeKeeping = DEFAULT_TIME_KEEPING as any): number {
  // After two-minute warning, incomplete passes, out-of-bounds gains, and first-down conversions do not consume time.
  let timeOff = calculateTimeOff(outcome, tk as any);
  if (inTwoMinute) {
    const isIncomplete = outcome.category === 'incomplete';
    const isOut = !!outcome.outOfBounds;
    if (isIncomplete || isOut || wasFirstDown) {
      timeOff = 0;
    }
  }
  return timeOff;
}
