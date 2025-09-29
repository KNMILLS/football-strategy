import { DEFAULT_TIME_KEEPING, Outcome, calculateTimeOff } from './ResultParsing';

export function timeOffWithTwoMinute(outcome: Outcome, inTwoMinute: boolean, wasFirstDown: boolean): number {
  // In main.js, after two-minute warning, incomplete passes and out-of-bounds gains and first-down conversions do not consume time.
  let timeOff = calculateTimeOff(outcome, DEFAULT_TIME_KEEPING);
  if (inTwoMinute) {
    const isIncomplete = outcome.category === 'incomplete';
    const isOut = !!outcome.outOfBounds;
    if (isIncomplete || isOut || wasFirstDown) {
      timeOff = 0;
    }
  }
  return timeOff;
}
