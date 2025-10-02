export function resolvePATAndRestart(state, side, deps) {
    const events = [];
    let next = { ...state };
    const diff = next.score.player - next.score.ai;
    const decision = deps.choosePAT?.({ diff, quarter: next.quarter, clock: next.clock, side })
        ?? (side === 'ai' ? ((() => { const late = next.quarter === 4 && next.clock <= 5 * 60; if (diff < 0 && -diff <= 2 && late)
            return 'two'; return 'kick'; })()) : 'kick');
    if (decision === 'two') {
        const success = deps.rng() < 0.5;
        if (success) {
            if (side === 'player')
                next.score.player += 2;
            else
                next.score.ai += 2;
            events.push({ type: 'score', payload: { ...deps.scoringSideToDelta(side, 2), kind: 'TwoPoint' } });
        }
    }
    else {
        const good = deps.attemptPatInternal(deps.rng);
        if (good) {
            if (side === 'player')
                next.score.player += 1;
            else
                next.score.ai += 1;
            events.push({ type: 'score', payload: { ...deps.scoringSideToDelta(side, 1), kind: 'XP' } });
        }
    }
    next.awaitingPAT = false;
    const koType = deps.chooseKickoffType?.({ trailing: deps.isTrailing(side, next.score), quarter: next.quarter, clock: next.clock }) ?? 'normal';
    const ko = deps.performKickoff(next, koType, side);
    return { state: ko.state, events: [...events, ...ko.events] };
}
export function attemptFieldGoal(state, attemptYards, side, deps) {
    const events = [];
    let next = { ...state };
    const pre = { ...next };
    let timeOff = deps.timeKeepingFieldGoalSeconds;
    let crossedTwoMinute = false;
    if ((pre.quarter === 2 || pre.quarter === 4) && pre.clock > 120 && pre.clock - timeOff < 120) {
        timeOff = pre.clock - 120;
        crossedTwoMinute = true;
    }
    next.clock = Math.max(0, pre.clock - timeOff);
    if (crossedTwoMinute) {
        events.push({ type: 'log', message: 'Brad: Two-minute warning.' });
        events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
    }
    const good = deps.attemptFieldGoalKick(deps.rng, attemptYards);
    if (good) {
        if (side === 'player')
            next.score.player += 3;
        else
            next.score.ai += 3;
        events.push({ type: 'score', payload: { ...deps.scoringSideToDelta(side, 3), kind: 'FG' } });
        const hash = deps.randomHash();
        const brad = `Field goal from ${attemptYards}, ${hash} — it is good. HOME ${next.score.player} — AWAY ${next.score.ai}, Q${next.quarter} ${deps.formatClock(next.clock)}`;
        const rob = 'Clean snap, clean hold; good rotation on the ball.';
        events.push({ type: 'log', message: `Brad: ${brad}` });
        events.push({ type: 'log', message: `Rob: ${rob}` });
        const ko = deps.performKickoff(next, 'normal', side);
        next = ko.state;
        events.push(...ko.events);
    }
    else {
        const miss = deps.missedFieldGoalSpot({ ballOn: next.ballOn, possessing: side }, attemptYards);
        next.possession = miss.possession;
        next.ballOn = miss.ballOn;
        const dd = { down: 1, toGo: 10 };
        next.down = dd.down;
        next.toGo = dd.toGo;
        const spotEnd = deps.formatTeamYardLine(next.possession, next.ballOn);
        const hash = deps.randomHash();
        const brad = `Field goal from ${attemptYards}, ${hash} — no good. ${next.possession === 'player' ? 'HOME' : 'AWAY'} ball at ${spotEnd}.`;
        const rob = 'Snap and hold were fine — just yanked it.';
        events.push({ type: 'log', message: `Brad: ${brad}` });
        events.push({ type: 'log', message: `Rob: ${rob}` });
    }
    events.push({ type: 'hud', payload: deps.hudPayload(next) });
    return { state: next, events };
}
//# sourceMappingURL=Scoring.js.map