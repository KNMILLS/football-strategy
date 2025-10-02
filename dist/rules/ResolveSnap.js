import { createDiceRoll, isForcedOverride, canAcceptDeclinePenalty, determineClockRunoff } from './DiceOutcome';
/**
 * Field position clamp helper
 * Ensures yards don't exceed remaining field; handles goal line and safety cases
 * GDD requirement: Tables map sums 3-39 only, field position never exceeds remaining field
 */
function clampFieldPosition(yards, currentPosition) {
    const fieldLength = 100; // 0-100 yard field
    if (currentPosition + yards > fieldLength) {
        // Would go beyond end zone - touchdown if gaining yards
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
 * Implements GDD specifications: doubles routing, penalty overrides, field clamping, OOB bias
 */
export function resolveSnap(offCardId, defCardId, matchupTable, penaltyTable, state, rng) {
    // Roll 2d20
    const die1 = Math.floor(rng() * 20) + 1;
    const die2 = Math.floor(rng() * 20) + 1;
    const diceRoll = createDiceRoll(die1, die2);
    // Check for doubles
    if (diceRoll.isDoubles) {
        if (diceRoll.sum === 2) { // 1-1
            return createDefTDDoublesResult(diceRoll);
        }
        else if (diceRoll.sum === 40) { // 20-20
            return createOffTDDoublesResult(diceRoll);
        }
        else { // 2-19 doubles
            return resolvePenaltyDoubles(diceRoll, penaltyTable, matchupTable, state, rng);
        }
    }
    else {
        // Normal 2d20 lookup (sums 3-39)
        return resolveNormalRoll(diceRoll, matchupTable, state);
    }
}
/**
 * Create a defensive touchdown doubles result (1-1)
 */
function createDefTDDoublesResult(diceRoll) {
    return {
        diceRoll,
        doubles: 'DEF_TD',
        finalClockRunoff: 30, // Normal clock runoff for TD
        description: 'Defensive touchdown on 1-1 doubles',
        tags: ['touchdown', 'defense', 'doubles']
    };
}
/**
 * Create an offensive touchdown doubles result (20-20)
 */
function createOffTDDoublesResult(diceRoll) {
    return {
        diceRoll,
        doubles: 'OFF_TD',
        finalClockRunoff: 30, // Normal clock runoff for TD
        description: 'Offensive touchdown on 20-20 doubles',
        tags: ['touchdown', 'offense', 'doubles']
    };
}
/**
 * Resolve penalty doubles (2-19) with proper override logic
 */
function resolvePenaltyDoubles(diceRoll, penaltyTable, matchupTable, state, rng) {
    // Roll d10 for penalty table (1-10, not 2-19)
    const penaltyRoll = Math.floor(rng() * 10) + 1;
    const penaltyInfo = penaltyTable.entries[penaltyRoll.toString()];
    const overridesPlayResult = isForcedOverride(penaltyRoll);
    const penaltyOutcome = {
        roll: penaltyRoll,
        penaltyInfo,
        overridesPlayResult
    };
    // If penalty overrides play result (forced override: 4, 5, or 6)
    if (overridesPlayResult) {
        const finalYards = penaltyInfo.yards !== undefined ? clampFieldPosition(penaltyInfo.yards, state.ballOn) : undefined;
        return {
            diceRoll,
            penalty: penaltyOutcome,
            doubles: 'PENALTY',
            finalYards,
            finalClockRunoff: 30, // Normal clock runoff for penalty
            description: `${penaltyInfo.label} (forced override)`,
            tags: ['penalty', 'forced', 'doubles', penaltyInfo.side]
        };
    }
    else {
        // Penalty doesn't override - compute base play and offer accept/decline
        const baseOutcome = resolveNormalRoll(diceRoll, matchupTable, state);
        return {
            diceRoll,
            baseOutcome,
            penalty: penaltyOutcome,
            doubles: 'PENALTY',
            canAcceptDecline: canAcceptDeclinePenalty(penaltyRoll),
            finalClockRunoff: baseOutcome.finalClockRunoff,
            description: `${baseOutcome.description} with ${penaltyInfo.label}`,
            tags: [...baseOutcome.tags, 'penalty', 'choice', penaltyInfo.side]
        };
    }
}
/**
 * Resolve normal 2d20 rolls (sums 3-39)
 */
function resolveNormalRoll(diceRoll, matchupTable, state) {
    const entry = matchupTable.entries[diceRoll.sum.toString()];
    if (!entry) {
        throw new Error(`No entry found for dice sum ${diceRoll.sum} in matchup table`);
    }
    // Apply field position clamp if meta indicates it should be used
    let finalYards = entry.yards;
    if (matchupTable.meta.field_pos_clamp && finalYards !== undefined) {
        finalYards = clampFieldPosition(finalYards, state.ballOn);
    }
    // Determine if this is a first down (for clock runoff logic)
    const isFirstDown = finalYards !== undefined && finalYards >= state.toGo;
    const baseOutcome = {
        yards: finalYards,
        turnover: entry.turnover ? {
            type: entry.turnover.type,
            return_yards: entry.turnover.return_yards,
            return_to: entry.turnover.return_to
        } : undefined,
        oob: entry.oob,
        clock: parseInt(entry.clock),
        tags: entry.tags
    };
    // Determine final clock runoff based on play characteristics
    const finalClockRunoff = determineClockRunoff(entry.oob, isFirstDown, entry.turnover?.type === 'INT' // Incomplete passes are turnovers but don't chain-move
    );
    // Create description
    let description = '';
    if (entry.turnover) {
        if (entry.turnover.type === 'INT') {
            description = `Interception`;
        }
        else if (entry.turnover.type === 'FUM') {
            description = `Fumble`;
        }
        if (entry.turnover.return_yards && entry.turnover.return_yards > 0) {
            description += ` returned ${entry.turnover.return_yards} yards`;
        }
    }
    else if (finalYards !== undefined) {
        if (finalYards > 0) {
            description = `${finalYards} yard gain`;
        }
        else if (finalYards < 0) {
            description = `${Math.abs(finalYards)} yard loss`;
        }
        else {
            description = 'No gain';
        }
    }
    if (entry.oob) {
        description += ' (out of bounds)';
    }
    if (entry.tags && entry.tags.length > 0) {
        description += ` (${entry.tags.join(', ')})`;
    }
    return {
        diceRoll,
        baseOutcome,
        finalYards,
        finalClockRunoff,
        description,
        tags: entry.tags || []
    };
}
/**
 * Helper to roll d20 (for use in tests or other contexts)
 */
export function rollD20(rng) {
    return Math.floor(rng() * 20) + 1;
}
/**
 * Helper to roll d10 (for penalty table lookups)
 */
export function rollD10(rng) {
    return Math.floor(rng() * 10) + 1;
}
//# sourceMappingURL=ResolveSnap.js.map