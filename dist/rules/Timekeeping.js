import { DEFAULT_TIME_KEEPING, calculateTimeOff } from './ResultParsing';
export function timeOffWithTwoMinute(outcome, inTwoMinute, wasFirstDown) {
    // After two-minute warning, incomplete passes, out-of-bounds gains, and first-down conversions do not consume time.
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
//# sourceMappingURL=Timekeeping.js.map