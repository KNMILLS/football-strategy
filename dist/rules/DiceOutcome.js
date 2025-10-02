/**
 * Helper function to create a dice roll
 */
export function createDiceRoll(d1, d2) {
    return {
        d1,
        d2,
        sum: d1 + d2,
        isDoubles: d1 === d2
    };
}
/**
 * Helper function to determine if a penalty roll is a forced override (4, 5, or 6)
 */
export function isForcedOverride(penaltyRoll) {
    return penaltyRoll >= 4 && penaltyRoll <= 6;
}
/**
 * Helper function to determine if penalty can be accepted/declined
 */
export function canAcceptDeclinePenalty(penaltyRoll) {
    return penaltyRoll >= 2 && penaltyRoll <= 19 && !isForcedOverride(penaltyRoll);
}
/**
 * Clock runoff determination based on play characteristics
 * OOB/incompletions = 10", chain-movers = 20", normal runs = 30"
 */
export function determineClockRunoff(oob, isFirstDown, isIncomplete) {
    if (oob || isIncomplete) {
        return 10;
    }
    else if (isFirstDown) {
        return 20;
    }
    else {
        return 30;
    }
}
/**
 * Roll a d20 using the new LCG-derived RNG value r in [0,1): face = floor(r * 20) + 1
 */
export function rollD20(rng) {
    const r = rng();
    return Math.floor(r * 20) + 1;
}
/**
 * Roll a d10 using the new LCG-derived RNG value r in [0,1): face = floor(r * 10) + 1
 */
export function rollD10(rng) {
    const r = rng();
    return Math.floor(r * 10) + 1;
}
//# sourceMappingURL=DiceOutcome.js.map