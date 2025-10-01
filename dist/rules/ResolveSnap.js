/**
 * Field position clamp helper
 * Ensures yards don't exceed remaining field; handles goal line and safety cases
 */
function clampFieldPosition(yards, currentPosition) {
    const fieldLength = 100; // 0-100 yard field
    if (currentPosition + yards > fieldLength) {
        // Would go beyond end zone - safety or touchdown depending on direction
        if (yards > 0) {
            return fieldLength - currentPosition; // Touchdown
        }
        else {
            return -currentPosition; // Safety (ball goes to 0)
        }
    }
    if (currentPosition + yards < 0) {
        return -currentPosition; // Safety (ball goes to 0)
    }
    return yards;
}
/**
 * Pure function to resolve a snap using 2d20 dice mechanics
 */
export function resolveSnap(offCardId, defCardId, matchupTable, penaltyTable, state, rng) {
    // Roll 2d20
    const die1 = Math.floor(rng() * 20) + 1;
    const die2 = Math.floor(rng() * 20) + 1;
    const sum = die1 + die2;
    // Check for doubles
    if (die1 === die2) {
        if (sum === 2) { // 1-1
            return {
                doubles: { kind: 'DEF_TD' }
            };
        }
        else if (sum === 40) { // 20-20
            return {
                doubles: { kind: 'OFF_TD' }
            };
        }
        else { // 2-19 doubles
            // Roll d10 for penalty table
            const penaltyRoll = Math.floor(rng() * 10) + 1;
            const penaltyOutcome = penaltyTable.entries[penaltyRoll.toString()];
            // Check if penalty overrides play result
            if (penaltyOutcome.override_play_result) {
                return {
                    penalty: {
                        side: penaltyOutcome.side,
                        yards: penaltyOutcome.yards,
                        auto_first_down: penaltyOutcome.auto_first_down,
                        loss_of_down: penaltyOutcome.loss_of_down,
                        replay_down: penaltyOutcome.replay_down,
                        override_play_result: penaltyOutcome.override_play_result,
                        label: penaltyOutcome.label
                    },
                    doubles: { kind: 'PENALTY' }
                };
            }
            else {
                // Penalty doesn't override - need to compute base play and offer accept/decline
                const baseResult = computeBaseResult(sum, matchupTable, state);
                return {
                    base: baseResult,
                    penalty: {
                        side: penaltyOutcome.side,
                        yards: penaltyOutcome.yards,
                        auto_first_down: penaltyOutcome.auto_first_down,
                        loss_of_down: penaltyOutcome.loss_of_down,
                        replay_down: penaltyOutcome.replay_down,
                        override_play_result: penaltyOutcome.override_play_result,
                        label: penaltyOutcome.label
                    },
                    doubles: { kind: 'PENALTY' },
                    options: { can_accept_decline: true }
                };
            }
        }
    }
    else {
        // Normal 2d20 lookup (sums 3-39)
        return computeBaseResult(sum, matchupTable, state);
    }
}
/**
 * Compute base result for normal 2d20 rolls
 */
function computeBaseResult(sum, matchupTable, state) {
    const entry = matchupTable.entries[sum.toString()];
    if (!entry) {
        throw new Error(`No entry found for dice sum ${sum} in matchup table`);
    }
    let yards = entry.yards;
    // Apply field position clamp if meta indicates it should be used
    if (matchupTable.meta.field_pos_clamp && yards !== undefined) {
        yards = clampFieldPosition(yards, state.ballOn);
    }
    return {
        yards,
        turnover: entry.turnover,
        oob: entry.oob,
        clock: entry.clock,
        tags: entry.tags
    };
}
/**
 * Helper to roll d20 (for use in tests or other contexts)
 */
export function rollD20(rng) {
    return Math.floor(rng() * 20) + 1;
}
//# sourceMappingURL=ResolveSnap.js.map