import { determineOutcomeFromCharts } from './Charts';
import { parseResultString } from './ResultParsing';
import { timeOffWithTwoMinute } from './Timekeeping';
export function applyYards(state, yards) {
    const next = { ...state };
    if (state.possession === 'player')
        next.ballOn = Math.max(0, Math.min(100, state.ballOn + yards));
    else
        next.ballOn = Math.max(0, Math.min(100, state.ballOn - yards));
    return next;
}
function handleScoring(state) {
    const next = { ...state, score: { ...state.score } };
    let touchdown = false;
    let safety = false;
    if (state.possession === 'player') {
        if (state.ballOn >= 100) {
            next.score.player += 6;
            touchdown = true;
        }
        if (state.ballOn <= 0) {
            next.score.ai += 2;
            safety = true;
        }
    }
    else {
        if (state.ballOn <= 0) {
            next.score.ai += 6;
            touchdown = true;
        }
        if (state.ballOn >= 100) {
            next.score.player += 2;
            safety = true;
        }
    }
    return { state: next, touchdown, safety };
}
export function resolvePlayCore(input) {
    let { state } = input;
    const outcome = determineOutcomeFromCharts({
        deckName: input.deckName,
        playLabel: input.playLabel,
        defenseLabel: input.defenseLabel,
        charts: input.charts,
        rng: input.rng,
    });
    // Penalties are handled externally; stop here if penalty
    if (outcome.category === 'penalty' && outcome.penalty) {
        return { state, outcome, touchdown: false, safety: false, possessionChanged: false };
    }
    // Apply yards or category effects
    let next = { ...state };
    let possessionChanged = false;
    if (outcome.category === 'gain' || outcome.category === 'loss') {
        next = applyYards(state, outcome.yards);
    }
    else if (outcome.category === 'incomplete') {
        // no yard change
    }
    else if (outcome.category === 'interception') {
        // Flip possession and apply return yards relative to new offense direction
        next.possession = state.possession === 'player' ? 'ai' : 'player';
        possessionChanged = true;
        // Spot at current LOS, then apply return towards new offense goal
        const ret = outcome.interceptReturn || 0;
        if (next.possession === 'player')
            next.ballOn = Math.max(0, Math.min(100, state.ballOn + ret));
        else
            next.ballOn = Math.max(0, Math.min(100, state.ballOn - ret));
        // Reset downs
        next.down = 1;
        next.toGo = 10;
    }
    else if (outcome.category === 'fumble') {
        // Simple turnover with no return
        next.possession = state.possession === 'player' ? 'ai' : 'player';
        possessionChanged = true;
        next.down = 1;
        next.toGo = 10;
    }
    // First down logic only if we didn't already reset downs due to turnover
    if (!possessionChanged && (outcome.category === 'gain' || outcome.category === 'loss')) {
        const gained = Math.abs(outcome.yards);
        const madeLine = gained >= state.toGo && outcome.yards > 0;
        if (madeLine) {
            next.down = 1;
            next.toGo = 10;
        }
        else {
            next.down = Math.min(4, state.down + 1);
            next.toGo = Math.max(1, madeLine ? 10 : state.toGo - Math.max(0, outcome.yards));
        }
    }
    else if (!possessionChanged && outcome.category === 'incomplete') {
        next.down = Math.min(4, state.down + 1);
    }
    // Timekeeping
    const wasFirstDown = !possessionChanged && (outcome.category === 'gain' && outcome.yards > 0 && outcome.yards >= state.toGo);
    const timeOff = timeOffWithTwoMinute(outcome, false /* caller should pass real two-minute later */, wasFirstDown);
    next.clock = Math.max(0, state.clock - timeOff);
    // Scoring check
    const scoreRes = handleScoring(next);
    next = scoreRes.state;
    return { state: next, outcome, touchdown: scoreRes.touchdown, safety: scoreRes.safety, possessionChanged };
}
//# sourceMappingURL=ResolvePlayCore.js.map