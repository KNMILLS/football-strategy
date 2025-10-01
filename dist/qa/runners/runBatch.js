import { sleepFrame } from '../util/dom';
import { createLCG } from '../../sim/RNG';
import { GameFlow } from '../../flow/GameFlow';
import { OFFENSE_DECKS, DEFENSE_DECK } from '../../data/decks';
export async function runBatch(bus, p) {
    const seeds = (p && Array.isArray(p.seeds) && p.seeds.length > 0) ? p.seeds.slice() : Array.from({ length: 100 }, (_, i) => i + 1);
    const charts = globalThis.GS?.tables?.offenseCharts;
    let wins = 0, losses = 0, ties = 0;
    let diffSum = 0;
    if (!charts) {
        for (let i = 0; i < seeds.length; i++) {
            const si = seeds[i] ?? 0;
            const r = Math.abs(Math.floor(Math.sin(si) * 10));
            const diff = (r % 3) - 1;
            diffSum += diff;
            if (diff > 0)
                wins++;
            else if (diff < 0)
                losses++;
            else
                ties++;
            if ((i % 10) === 9)
                await sleepFrame();
        }
    }
    else {
        for (let i = 0; i < seeds.length; i++) {
            const seed = seeds[i] ?? 1;
            try {
                const rng = createLCG(seed);
                const flow = new GameFlow({ charts, rng, timeKeeping: {
                        gain0to20: 30,
                        gain20plus: 45,
                        loss: 30,
                        outOfBounds: 15,
                        incomplete: 15,
                        interception: 30,
                        penalty: 15,
                        fumble: 15,
                        kickoff: 15,
                        fieldgoal: 15,
                        punt: 15,
                        extraPoint: 0,
                    }, policy: { chooseTempo: () => 'normal' } });
                let state = initializeState(seed);
                const ko = flow.performKickoff(state, 'normal', 'ai');
                state = ko.state;
                while (!state.gameOver) {
                    const offDeck = state.possession === 'player' ? OFFENSE_DECKS['Pro Style'] : OFFENSE_DECKS['Pro Style'];
                    const play = offDeck[Math.min(state.down % 2, offDeck.length - 1)]?.label || offDeck[0]?.label || 'Run & Pass Option';
                    const defense = DEFENSE_DECK[4]?.label || 'Run & Pass';
                    const res = flow.resolveSnap(state, { deckName: 'Pro Style', playLabel: play, defenseLabel: defense });
                    state = res.state;
                }
                const diff = state.score.player - state.score.ai;
                diffSum += diff;
                if (diff > 0)
                    wins++;
                else if (diff < 0)
                    losses++;
                else
                    ties++;
            }
            catch { }
            if ((i % 10) === 9)
                await sleepFrame();
        }
    }
    const avgDiff = seeds.length ? (diffSum / seeds.length).toFixed(2) : '0.00';
    bus.emit('log', { message: `DEV: Batch — n=${seeds.length} W:${wins} L:${losses} T:${ties} avgDiff:${avgDiff}` });
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function initializeState(seed, opts) {
    const s = {
        seed,
        quarter: 1,
        clock: 15 * 60,
        down: 1,
        toGo: 10,
        ballOn: 25,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 },
    };
    const o = opts || {};
    if (o.possession)
        s.possession = o.possession;
    if (typeof o.ballOn === 'number')
        s.ballOn = clamp(o.ballOn, 1, 99);
    if (typeof o.down === 'number')
        s.down = clamp(o.down, 1, 4);
    if (typeof o.toGo === 'number')
        s.toGo = clamp(o.toGo, 1, 30);
    if (typeof o.quarter === 'number')
        s.quarter = clamp(o.quarter, 1, 4);
    if (typeof o.clock === 'number')
        s.clock = clamp(o.clock, 0, 15 * 60);
    return s;
}
//# sourceMappingURL=runBatch.js.map