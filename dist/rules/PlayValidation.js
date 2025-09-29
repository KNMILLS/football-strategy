export function isGoalToGo(state) {
    const offenseIsPlayer = state.possession === 'player';
    const distance = offenseIsPlayer ? (100 - state.ballOn) : state.ballOn;
    return state.toGo >= distance && distance <= 10;
}
export function distanceToOpponentGoal(state) {
    return state.possession === 'player' ? (100 - state.ballOn) : state.ballOn;
}
export function canAttemptFieldGoal(state, attemptYards) {
    return attemptYards <= 45;
}
export function validateOffensePlay(ctx, playLabel, cardType) {
    const issues = [];
    const { state, whiteSignRestrictions } = ctx;
    if (cardType === 'punt') {
        if (state.down !== 4) {
            issues.push({ code: 'PUNT_NOT_4TH', message: 'Punt is only allowed on 4th down.' });
        }
    }
    if (cardType === 'run' || cardType === 'pass') {
        const required = whiteSignRestrictions[playLabel];
        if (typeof required === 'number') {
            const dist = distanceToOpponentGoal(state);
            if (dist <= required) {
                issues.push({ code: 'WHITE_SIGN_RESTRICTED', message: 'This play is restricted near the goal line.', requiredDistance: required, currentDistance: dist });
            }
        }
    }
    if (cardType === 'field-goal') {
        const distance = distanceToOpponentGoal(state);
        const attemptYards = distance + 17; // 7 placement + 10 end zone
        if (!canAttemptFieldGoal(state, attemptYards)) {
            issues.push({ code: 'FG_OUT_OF_RANGE', message: 'Field goal attempt is out of range.', attemptYards });
        }
    }
    if (!playLabel) {
        issues.push({ code: 'UNKNOWN_LABEL', message: 'Unknown play label.' });
    }
    return issues;
}
//# sourceMappingURL=PlayValidation.js.map