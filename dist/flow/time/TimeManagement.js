import { timeOffWithTwoMinute } from '../../rules/Timekeeping';
import { DEFAULT_TIME_KEEPING } from '../../rules/ResultParsing';
import { isTwoMinute } from '../utils/GameFlowUtils';
/**
 * Calculates time to be taken off the clock for a play
 * Handles two-minute warning, tempo adjustments, and special cases
 * @param pre - Game state before the play
 * @param outcome - Play outcome
 * @param timeKeeping - Time keeping configuration
 * @param tempo - Tempo strategy to apply
 * @param hadUntimed - Whether this was an untimed down
 * @returns Time management result
 */
export function calculateTimeOff(pre, outcome, timeKeeping, tempo, hadUntimed = false, possessionChanged) {
    if (hadUntimed) {
        return { timeOff: 0, crossedTwoMinute: false };
    }
    const inTwoBefore = isTwoMinute(pre.quarter, pre.clock);
    let timeOff = 0;
    let crossedTwoMinute = false;
    // Calculate base time off
    if (outcome) {
        const wasFirstDown = !possessionChanged &&
            outcome.category === 'gain' &&
            (outcome.yards || 0) > 0 &&
            (outcome.yards || 0) >= pre.toGo;
        const tk = timeKeeping || DEFAULT_TIME_KEEPING;
        timeOff = timeOffWithTwoMinute(outcome, inTwoBefore, wasFirstDown, tk);
    }
    // Apply tempo adjustments
    if (tempo === 'hurry_up' || tempo === 'no_huddle') {
        timeOff = Math.max(5, Math.floor(timeOff * 0.7));
    }
    else if (tempo === 'burn_clock') {
        if (outcome && (outcome.category === 'gain' || outcome.category === 'loss')) {
            timeOff = Math.max(timeOff, 35);
            timeOff = Math.min(timeOff, 40);
        }
    }
    // Handle two-minute warning
    if ((pre.quarter === 2 || pre.quarter === 4) && pre.clock > 120 && pre.clock - timeOff < 120) {
        timeOff = pre.clock - 120;
        crossedTwoMinute = true;
    }
    return { timeOff, crossedTwoMinute };
}
/**
 * Applies time management result to game state
 * @param state - Current game state
 * @param timeResult - Time management result
 * @returns Updated game state with new clock time
 */
export function applyTimeOff(state, timeResult) {
    const next = { ...state };
    next.clock = Math.max(0, state.clock - timeResult.timeOff);
    return next;
}
/**
 * Determines tempo strategy based on game situation and policy
 * @param ctx - Game context
 * @param policy - Optional tempo policy function
 * @returns Recommended tempo strategy
 */
export function determineTempo(ctx, policy) {
    if (policy) {
        return policy(ctx);
    }
    // Default tempo logic
    const lateGame = ctx.quarter >= 3;
    const trailing = ctx.diff < 0;
    const leading = ctx.diff > 0;
    // Late game situations
    if (lateGame && ctx.clock <= 300) { // Last 5 minutes
        if (trailing && Math.abs(ctx.diff) <= 8) {
            return 'hurry_up'; // Trailing team hurries up
        }
        else if (leading && Math.abs(ctx.diff) <= 14) {
            return 'burn_clock'; // Leading team burns clock
        }
    }
    // Two-minute drill
    if (isTwoMinute(ctx.quarter, ctx.clock)) {
        if (trailing)
            return 'hurry_up';
        if (leading)
            return 'burn_clock';
    }
    return 'normal';
}
//# sourceMappingURL=TimeManagement.js.map