import { DEFAULT_TIME_KEEPING } from './ResultParsing';
function clampBallOn(v) {
    return Math.max(0, Math.min(100, v));
}
function yardsTowardsOffense(pre, yards) {
    return pre.possession === 'player' ? yards : -yards;
}
function applyFromAbsolute(prevAbs, yardsTowardsOff) {
    return clampBallOn(prevAbs + yardsTowardsOff);
}
function distanceToOffenseGoal(pre, ballOnAbs) {
    // Distance from current spot to offense goal line along offense direction
    return pre.possession === 'player' ? (100 - ballOnAbs) : ballOnAbs;
}
function distanceToDefenseGoal(pre, ballOnAbs) {
    // Distance from current spot to defense goal line (opposite of offense goal)
    return pre.possession === 'player' ? ballOnAbs : (100 - ballOnAbs);
}
function capHalfDistance(amount, capDistance) {
    const cap = Math.floor(capDistance / 2);
    if (amount > cap)
        return { applied: cap, capped: true };
    return { applied: amount, capped: false };
}
function recomputeDownAndDistance(pre, newBallOn, resetFirstDown) {
    if (resetFirstDown) {
        const yardsToGoal = pre.possession === 'player' ? (100 - newBallOn) : newBallOn;
        const toGo = Math.min(10, yardsToGoal);
        return { down: 1, toGo };
    }
    // No reset: repeat down on accepted penalty administered from previous spot
    // (Standard scrimmage penalties replay the down)
    const yardsToGoal = pre.possession === 'player' ? (100 - newBallOn) : newBallOn;
    const lineToGainRemaining = Math.min(10, yardsToGoal); // assume fresh series retained at pre snap
    return { down: Math.max(1, pre.down), toGo: Math.max(1, lineToGainRemaining) };
}
function isLongGain(outcome) {
    if (!outcome)
        return false;
    if (outcome.raw && /\bLG\b/i.test(outcome.raw))
        return true;
    return false;
}
function computeTimeOff(inTwoMinute, untimed) {
    if (untimed)
        return 0;
    // Use penalty time from defaults
    return DEFAULT_TIME_KEEPING.penalty;
}
function makeBase(state) {
    return { ...state, score: { ...state.score } };
}
function marchPenalty(pre, basisAbs, pen, lgMidfield) {
    const measuredFromMidfieldForLG = lgMidfield && pen.on === 'defense';
    const spotBasis = measuredFromMidfieldForLG ? 'midfield' : 'previous';
    const startAbs = measuredFromMidfieldForLG ? 50 : basisAbs;
    if (pen.on === 'defense') {
        // March towards offense goal line; cap at half distance to offense goal from start
        const distToGoal = distanceToOffenseGoal(pre, startAbs);
        const { applied, capped } = capHalfDistance(pen.yards, distToGoal);
        const newAbs = applyFromAbsolute(startAbs, yardsTowardsOffense(pre, applied));
        return { ballOn: newAbs, capped, spotBasis };
    }
    else {
        // Against offense: march away from offense goal (towards defense goal) from previous spot
        const distToDefGoal = distanceToDefenseGoal(pre, startAbs);
        const { applied, capped } = capHalfDistance(pen.yards, distToDefGoal);
        const newAbs = applyFromAbsolute(startAbs, yardsTowardsOffense(pre, -applied));
        return { ballOn: newAbs, capped, spotBasis };
    }
}
export function administerPenalty(ctx) {
    const { prePlayState: pre, postPlayState: post, outcome, inTwoMinute } = ctx;
    const pen = outcome.penalty;
    const lg = isLongGain(outcome);
    const measuredFromMidfieldForLG = lg && pen.on === 'defense';
    // Declined always keeps post-play state and normal clock off already applied later by caller
    const declined = makeBase(post);
    // Accepted: administered from previous spot by default, special LG from midfield
    const march = marchPenalty(pre, pre.ballOn, pen, measuredFromMidfieldForLG);
    const autoFD = !!pen.firstDown && pen.on === 'defense';
    const dd = recomputeDownAndDistance(pre, march.ballOn, autoFD);
    const acceptedBase = makeBase(pre);
    let accepted = { ...acceptedBase, ballOn: march.ballOn, down: dd.down, toGo: dd.toGo };
    // Timekeeping & untimed down rule: defensive penalty at 0:00 in regulation → untimed down
    const isRegulation = pre.quarter <= 4;
    const atZero = pre.clock === 0 || accepted.clock === 0;
    const defensive = pen.on === 'defense';
    const untimedDownScheduled = defensive && isRegulation && atZero;
    const timeOff = computeTimeOff(inTwoMinute, untimedDownScheduled);
    accepted.clock = Math.max(0, pre.clock - timeOff);
    const adminMeta = {
        automaticFirstDownApplied: autoFD,
        halfDistanceCapped: march.capped,
        measuredFromMidfieldForLG,
        spotBasis: march.spotBasis,
        untimedDownScheduled,
    };
    // Decision heuristic
    function valueOf(st) {
        // Higher is better for offense: consider yards gained towards offense goal and down/toGo
        const yardsToOffGoal = distanceToOffenseGoal(pre, st.ballOn);
        const yardsAdv = -(yardsToOffGoal) + distanceToOffenseGoal(pre, pre.ballOn);
        const downValue = st.down === 1 ? 5 : (st.down === 2 ? 2 : (st.down === 3 ? 0 : -3));
        const toGoValue = Math.max(0, 10 - st.toGo) * 0.2;
        return yardsAdv + downValue + toGoValue;
    }
    const vAccept = valueOf(accepted);
    const vDecline = valueOf(declined);
    let decisionHint = 'neutral';
    if (vAccept > vDecline + 0.5)
        decisionHint = 'accept';
    else if (vDecline > vAccept + 0.5)
        decisionHint = 'decline';
    return { accepted, declined, decisionHint, adminMeta };
}
//# sourceMappingURL=PenaltyAdmin.js.map