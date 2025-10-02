export function resolveSafetyRestart(state, conceding, deps) {
    const events = [];
    let next = { ...state };
    const leading = deps.isLeading(conceding === 'player' ? 'ai' : 'player', next.score);
    const choice = deps.chooseSafetyFreeKick?.({ leading }) ?? 'kickoff+25';
    const kicking = conceding;
    if (choice === 'kickoff+25') {
        const receiver = kicking === 'player' ? 'ai' : 'player';
        const abs = receiver === 'player' ? 25 : 75;
        next.possession = receiver;
        next.ballOn = abs;
        const dd = { down: 1, toGo: 10 };
        next.down = dd.down;
        next.toGo = dd.toGo;
        events.push({ type: 'kickoff', payload: { onside: false } });
    }
    else {
        const receiver = kicking === 'player' ? 'ai' : 'player';
        const abs = receiver === 'player' ? 35 : 65;
        next.possession = receiver;
        next.ballOn = abs;
        const dd = { down: 1, toGo: 10 };
        next.down = dd.down;
        next.toGo = dd.toGo;
        events.push({ type: 'kickoff', payload: { onside: false } });
    }
    events.push({ type: 'hud', payload: {
            quarter: next.quarter, clock: next.clock, down: next.down, toGo: next.toGo, ballOn: next.ballOn, possession: next.possession, score: { player: next.score.player, ai: next.score.ai }
        } });
    return { state: next, events };
}
//# sourceMappingURL=Safety.js.map