function clampYard(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
}
export function isInEndZone(absYard) {
    return absYard === 0 || absYard === 100;
}
export function isThroughEndZone(absYard) {
    return absYard < 0 || absYard > 100;
}
export function touchbackSpot(forReceiving) {
    return forReceiving === 'player' ? 20 : 80;
}
export function interceptionTouchback(ctx) {
    const ballOn = touchbackSpot(ctx.possessing);
    return { ballOn, possession: ctx.possessing };
}
export function kickoffTouchback(forReceiving) {
    return { ballOn: touchbackSpot(forReceiving), possession: forReceiving };
}
export function puntTouchback(forReceiving) {
    return { ballOn: touchbackSpot(forReceiving), possession: forReceiving };
}
// Apply “spot of kick or 20”: if the kick spot is beyond the 20 (closer to opponent),
// take over at the spot; otherwise take at the 20.
export function missedFieldGoalSpot(state, attemptYards) {
    const receiving = state.possessing === 'player' ? 'ai' : 'player';
    const spotOfKickAbs = clampYard(state.possessing === 'player' ? state.ballOn - 7 : state.ballOn + 7);
    // Apply spot-of-kick or 20: for HOME (player) receiving, take max(20, spot); for AWAY (ai) receiving, take min(80, spot)
    let newAbs;
    if (receiving === 'player')
        newAbs = Math.max(20, spotOfKickAbs);
    else
        newAbs = Math.min(80, spotOfKickAbs);
    return { ballOn: clampYard(newAbs), possession: receiving };
}
//# sourceMappingURL=Spots.js.map