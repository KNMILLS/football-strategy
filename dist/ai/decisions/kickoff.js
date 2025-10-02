export function chooseKickoff(ai) {
    const { state, coach, rng } = ai;
    const offenseScore = state.score[(state.possession === 'player') ? 'player' : 'ai'];
    const defenseScore = state.score[(state.possession === 'player') ? 'ai' : 'player'];
    const trailing = offenseScore < defenseScore; // kicking team is offense after a score or start; assume this function used at kickoff time
    const lateQ4Tight = state.quarter === 4 && state.clock <= 2 * 60;
    const downBigLate = state.quarter === 4 && state.clock <= 4 * 60 && (defenseScore - offenseScore) >= 9;
    let onsideProb = 0;
    if (trailing && (lateQ4Tight || downBigLate)) {
        onsideProb = coach.onsideAggressive ? 0.7 : 0.3;
    }
    const pickOnside = rng() < onsideProb;
    return { kind: 'kickoff', type: pickOnside ? 'onside' : 'normal' };
}
//# sourceMappingURL=kickoff.js.map