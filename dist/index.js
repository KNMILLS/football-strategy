// Bootstrap: expose extracted modules for gradual integration
import * as Kickoff from './rules/special/Kickoff';
import * as Punt from './rules/special/Punt';
import * as PlaceKicking from './rules/special/PlaceKicking';
import * as ResultParsing from './rules/ResultParsing';
import * as Timekeeping from './rules/Timekeeping';
import * as Charts from './rules/Charts';
import * as LongGain from './rules/LongGain';
import * as PATDecision from './ai/PATDecision';
import * as CoachProfiles from './ai/CoachProfiles';
import { resolvePlayCore } from './rules/ResolvePlayCore';
import { EventBus } from './utils/EventBus';
import { GameFlow } from './flow/GameFlow';
import { createLCG } from './sim/RNG';
import { validateOffensePlay, canAttemptFieldGoal } from './rules/PlayValidation';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from './data/decks';
let uiRegistered = false;
const bus = new EventBus();
let tables = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
async function ensureUIRegistered() {
    if (uiRegistered)
        return;
    try {
        (await import('./ui/HUD')).registerHUD(bus);
    }
    catch { }
    try {
        (await import('./ui/Log')).registerLog(bus);
    }
    catch { }
    try {
        (await import('./ui/Field')).registerField(bus);
    }
    catch { }
    try {
        (await import('./ui/Hand')).registerHand(bus);
    }
    catch { }
    try {
        (await import('./ui/Controls')).registerControls(bus);
    }
    catch { }
    try {
        (await import('./ui/DevMode')).registerDevMode(bus);
    }
    catch { }
    try {
        (await import('./ui/SpecialTeamsUI')).registerSpecialTeamsUI(bus);
    }
    catch { }
    try {
        (await import('./ui/PenaltyUI')).registerPenaltyUI(bus);
    }
    catch { }
    try {
        (await import('./ui/VFX')).registerVFX(bus);
    }
    catch { }
    try {
        (await import('./ui/SFX')).registerSFX(bus);
    }
    catch { }
    try {
        (await import('./qa/Harness')).registerQAHarness(bus);
    }
    catch { }
    uiRegistered = true;
}
async function preloadTables() {
    try {
        const loaders = await import('./data/loaders/tables');
        const [oc, pk, tk, lg] = await Promise.all([
            loaders.fetchOffenseCharts(),
            loaders.fetchPlaceKicking(),
            loaders.fetchTimeKeeping(),
            loaders.fetchLongGain(),
        ]);
        tables = {
            offenseCharts: oc.ok ? oc.data : null,
            placeKicking: pk.ok ? pk.data : null,
            timeKeeping: tk.ok ? tk.data : null,
            longGain: lg.ok ? lg.data : null,
        };
        const summary = `Loaded offense charts ${oc.ok ? '✓' : `✕ (${oc.error.code})`}, place-kicking ${pk.ok ? '✓' : `✕ (${pk.error.code})`}, timekeeping ${tk.ok ? '✓' : `✕ (${tk.error.code})`}, long-gain ${lg.ok ? '✓' : `✕ (${lg.error.code})`}`;
        bus.emit('log', { message: summary });
    }
    catch {
        tables = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
    }
    if (typeof window !== 'undefined' && window.GS) {
        window.GS.tables = tables;
    }
}
function setTheme(theme) {
    if (typeof document === 'undefined')
        return;
    document.body.dataset.theme = theme;
}
// Bridge UI theme change events to body dataset
bus.on('ui:themeChanged', ({ theme }) => {
    try {
        setTheme(theme);
    }
    catch { }
});
async function start(options) {
    if (typeof window === 'undefined')
        return;
    await ensureUIRegistered();
    if (options && options.theme)
        setTheme(options.theme);
    await preloadTables();
    // Emit a baseline HUD update so UI is not blank in smoke tests
    bus.emit('hudUpdate', {
        quarter: 1,
        clock: 15 * 60,
        down: 1,
        toGo: 10,
        ballOn: 25,
        possession: 'player',
        score: { player: 0, ai: 0 },
    });
}
function dispose() {
    // No timers yet; leave bus listeners intact for now. Future timers/intervals cleared here.
}
const runtime = {
    bus,
    rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain },
    ai: { PATDecision, CoachProfiles },
    tables,
    start,
    dispose,
    setTheme,
    runtime: {
        resolvePlayAdapter: (params) => {
            const res = resolvePlayCore({
                state: params.state,
                charts: params.charts,
                deckName: params.deckName,
                playLabel: params.playLabel,
                defenseLabel: params.defenseLabel,
                rng: params.rng,
            });
            const nextState = {
                ...res.state,
                clock: params.state.clock,
                score: { ...params.state.score },
                awaitingPAT: params.state.awaitingPAT,
                gameOver: params.state.gameOver,
            };
            const events = [];
            if (res.possessionChanged)
                events.push({ type: 'possessionChanged' });
            if (res.touchdown)
                events.push({ type: 'touchdown' });
            if (res.safety)
                events.push({ type: 'safety' });
            return { nextState, outcome: res.outcome, events };
        },
        createFlow: (seed) => {
            const rng = createLCG(seed ?? 12345);
            if (!tables.offenseCharts)
                throw new Error('Offense charts not loaded');
            const flow = new GameFlow({ charts: tables.offenseCharts, rng });
            let flowState = null;
            let pendingPenalty = null;
            const translate = (events) => {
                for (const ev of events) {
                    if (ev.type === 'hud')
                        bus.emit('hudUpdate', ev.payload);
                    else if (ev.type === 'log') {
                        bus.emit('log', { message: ev.message });
                        if (/Field goal missed/i.test(ev.message)) {
                            bus.emit && bus.emit('vfx:banner', { text: 'NO GOOD' });
                            bus.emit && bus.emit('sfx:crowd', { kind: 'groan' });
                        }
                    }
                    else if (ev.type === 'vfx') {
                        const kind = ev.payload.kind;
                        if (kind === 'td') {
                            bus.emit && bus.emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
                            bus.emit && bus.emit('vfx:flash', {});
                            bus.emit && bus.emit('sfx:crowd', { kind: 'cheer' });
                        }
                        else if (kind === 'interception') {
                            bus.emit && bus.emit('vfx:banner', { text: 'INTERCEPTION!' });
                            bus.emit && bus.emit('vfx:shake', { selector: 'body' });
                            bus.emit && bus.emit('sfx:hit', {});
                        }
                        else if (kind === 'twoMinute') {
                            bus.emit && bus.emit('vfx:flash', {});
                        }
                        bus.emit('vfx', { type: kind, payload: ev.payload.data });
                    }
                    else if (ev.type === 'choice-required') {
                        bus.emit('flow:choiceRequired', { choice: ev.choice, data: ev.data });
                        if (ev.choice === 'penaltyAcceptDecline') {
                            const d = ev.data || {};
                            pendingPenalty = { accepted: d.accepted, declined: d.declined, meta: d.meta };
                        }
                    }
                    else if (ev.type === 'final')
                        bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
                    else if (ev.type === 'halftime')
                        bus.emit('log', { message: 'Halftime' });
                    else if (ev.type === 'endOfQuarter')
                        bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
                    else if (ev.type === 'score') {
                        bus.emit('log', { message: `Score: ${ev.payload.kind}` });
                        bus.emit && bus.emit('vfx:scorePop', {});
                        if (ev.payload.kind === 'FG') {
                            bus.emit && bus.emit('vfx:banner', { text: 'FIELD GOAL!' });
                            bus.emit && bus.emit('sfx:beep', { freq: 880, type: 'triangle' });
                        }
                        else if (ev.payload.kind === 'Safety') {
                            bus.emit && bus.emit('vfx:banner', { text: 'SAFETY!', gold: true });
                            bus.emit && bus.emit('sfx:beep', { freq: 220, type: 'square' });
                        }
                        else if (ev.payload.kind === 'TD') {
                            bus.emit && bus.emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
                            bus.emit && bus.emit('sfx:crowd', { kind: 'cheer' });
                        }
                    }
                }
            };
            bus.on && bus.on('ui:choice.penalty', (p) => {
                if (!pendingPenalty)
                    return;
                const ctx = pendingPenalty;
                const chosen = p.decision === 'accept' ? ctx.accepted : ctx.declined;
                const fin = flow.finalizePenaltyDecision(chosen, p.decision, ctx.meta);
                flowState = fin.state;
                translate(fin.events);
                pendingPenalty = null;
            });
            return {
                resolveSnap: (state, input) => {
                    const res = flow.resolveSnap(state, input);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                applyPenaltyDecision: (state, decision, context) => {
                    const chosen = decision === 'accept' ? context.accepted : context.declined;
                    const fin = flow.finalizePenaltyDecision(chosen, decision, context.meta);
                    translate(fin.events);
                    flowState = fin.state;
                    return fin;
                },
                resolvePATAndRestart: (state, side) => {
                    const res = flow.resolvePATAndRestart(state, side);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                attemptFieldGoal: (state, attemptYards, side) => {
                    const res = flow.attemptFieldGoal(state, attemptYards, side);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                resolveSafetyRestart: (state, conceding) => {
                    const res = flow.resolveSafetyRestart(state, conceding);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                performKickoff: (state, type, kicking) => {
                    const res = flow.performKickoff(state, type, kicking);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                inner: flow,
            };
        },
    },
};
if (typeof window !== 'undefined' && !window.GS) {
    window.GS = runtime;
}
// Ensure no legacy bridge remains; runtime boots purely via TS modules.
//# sourceMappingURL=index.js.map