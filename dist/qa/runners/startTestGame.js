import { createLCG } from '../../sim/RNG';
import { GameFlow } from '../../flow/GameFlow';
import * as CoachProfiles from '../../ai/CoachProfiles';
import { chooseOffense, chooseKickoff, PlayerTendenciesMemory } from '../../ai/Playcall';
import { PlayCaller } from '../../ai/PlayCaller';
import { sleepFrame } from '../util/dom';
import { pushDebugEntry, resetDebugEntries, setDebugSeed } from '../debug/buffer';
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
export async function startTestGame(bus, p) {
    try {
        const seed = typeof p.seed === 'number' ? p.seed : 123456789;
        const rng = createLCG(seed);
        resetDebugEntries();
        setDebugSeed(seed);
        const charts = globalThis.GS?.tables?.offenseCharts;
        const runtimeFlow = null;
        const playbookNameFrom = (s) => (['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'].includes(s)) ? s : 'West Coast';
        const playbookNames = ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'];
        const randomPlaybook = () => playbookNames[Math.floor(rng() * playbookNames.length)];
        const playerPlaybookName = playbookNameFrom(p?.playerDeck) || randomPlaybook();
        const aiPlaybookName = playbookNameFrom(p?.aiDeck) || randomPlaybook();
        // Dice engine playbooks don't need deck objects
        const coachKeys = Object.keys(CoachProfiles);
        const pickCoach = () => CoachProfiles[coachKeys[Math.floor(rng() * coachKeys.length)]];
        const playerCoach = p?.playerCoach && CoachProfiles[p?.playerCoach] ? CoachProfiles[p?.playerCoach] : pickCoach();
        const aiCoach = p?.aiCoach && CoachProfiles[p?.aiCoach] ? CoachProfiles[p?.aiCoach] : pickCoach();
        bus.emit('log', { message: `Loaded offense charts ${charts ? '✓' : '✗'} (seed=${seed})` });
        if (!charts) {
            const home = Math.abs(Math.floor(rng() * 40));
            const away = Math.abs(Math.floor(rng() * 40));
            bus.emit('log', { message: `Final — HOME ${home} — AWAY ${away}` });
            return;
        }
        const flow = runtimeFlow ? null : new GameFlow({ charts, rng, timeKeeping: {
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
        const startingPossession = (p && (p.startingPossession === 'player' || p.startingPossession === 'ai')) ? p.startingPossession : (rng() < 0.5 ? 'player' : 'ai');
        let state = initializeState(seed, { possession: startingPossession });
        const kicking = state.possession === 'player' ? 'ai' : 'player';
        const performKickoff = (s, type, k) => (runtimeFlow ? runtimeFlow.performKickoff(s, type, k) : flow.performKickoff(s, type, k));
        const resolveSnap = (s, input) => (runtimeFlow ? runtimeFlow.resolveSnap(s, input) : flow.resolveSnap(s, input));
        // Dev-mode helpers for prefixed commentary
        const isDevModeOn = () => {
            try {
                if (typeof localStorage !== 'undefined')
                    return localStorage.getItem('gs_dev_mode') === '1';
            }
            catch { }
            try {
                return !!globalThis.GS?.__devMode?.enabled;
            }
            catch { }
            return false;
        };
        const formatClock = (seconds) => {
            const s = Math.max(0, Math.floor(seconds));
            const mPart = Math.floor(s / 60);
            const sPart = (s % 60).toString().padStart(2, '0');
            return `${mPart}:${sPart}`;
        };
        const buildPlayPrefix = (s, offLabel, defLabel) => {
            const downNames = ['1st', '2nd', '3rd', '4th'];
            const downIdx = Math.min(s.down, 4) - 1;
            const downStr = downNames[downIdx] || `${s.down}th`;
            const firstDownAbs = s.possession === 'player' ? (s.ballOn + s.toGo) : (s.ballOn - s.toGo);
            const isG2G = s.possession === 'player' ? (firstDownAbs >= 100) : (firstDownAbs <= 0);
            const toGoLabel = isG2G ? 'Goal' : String(s.toGo);
            const ballSpot = s.ballOn <= 50 ? s.ballOn : 100 - s.ballOn;
            const possLabel = s.possession === 'player' ? 'HOME' : 'AWAY';
            return `Q${s.quarter} | ${formatClock(s.clock)} | ${downStr} & ${toGoLabel} | Ball on ${Math.round(ballSpot)} | ${possLabel} (possession) | ${offLabel} | ${defLabel}`;
        };
        let lastPreState = null;
        let lastOffLabel = '';
        let lastDefLabel = '';
        const translate = (events) => {
            for (const ev of events || []) {
                if (ev.type === 'hud')
                    bus.emit('hudUpdate', ev.payload);
                else if (ev.type === 'log') {
                    const dev = isDevModeOn();
                    if (dev && lastPreState && lastOffLabel && lastDefLabel && /^Brad:/.test(String(ev.message || ''))) {
                        const pref = buildPlayPrefix(lastPreState, lastOffLabel, lastDefLabel);
                        bus.emit('log', { message: `${pref} — ${ev.message}` });
                    }
                    else {
                        bus.emit('log', { message: ev.message });
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
                }
            }
        };
        function evaluateStateForPlayer(s) {
            const scoreDiff = s.score.player - s.score.ai;
            let val = scoreDiff * 1000;
            if (s.possession === 'player') {
                val += s.ballOn;
                val += (5 - s.down) * 2;
                val += (10 - s.toGo);
            }
            else {
                val += (100 - s.ballOn);
                val += (s.down - 1) * 2;
                val += s.toGo;
            }
            return val;
        }
        try {
            const isDev = (() => {
                try {
                    if (typeof localStorage !== 'undefined')
                        return localStorage.getItem('gs_dev_mode') === '1';
                }
                catch { }
                try {
                    return !!globalThis.GS?.__devMode?.enabled;
                }
                catch { }
                return false;
            })();
            if (isDev) {
                pushDebugEntry('GRIDIRON DEBUG PLAY LOG');
                pushDebugEntry(`Generated: ${new Date().toISOString()}`);
            }
        }
        catch { }
        const koDecision = chooseKickoff({ state, coach: (kicking === 'player' ? playerCoach : aiCoach), rng });
        const koRes = performKickoff(state, koDecision.type, kicking);
        state = koRes.state;
        translate(koRes.events || []);
        const tendencies = new PlayerTendenciesMemory();
        let currentOffenseDeck = [];
        const deps = {
            charts: charts,
            getOffenseHand: () => [
                { id: 'wc-quick-slant', label: 'Quick Slant', type: 'pass' },
                { id: 'wc-screen-pass', label: 'Screen Pass', type: 'pass' },
                { id: 'sm-power-o', label: 'Power O', type: 'run' },
                { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' },
            ],
            getDefenseOptions: () => ['Goal Line', 'Cover 2', 'Blitz', 'Prevent'],
            getWhiteSignRestriction: (label) => null, // No restrictions in dice engine
        };
        const pcPlayer = new PlayCaller(deps, true);
        const pcAI = new PlayCaller(deps, true);
        try {
            await pcPlayer.loadPersonality();
            await pcAI.loadPersonality();
        }
        catch { }
        pcPlayer.reset(seed);
        pcAI.reset(seed + 1);
        while (!state.gameOver) {
            const offenseIsPlayer = state.possession === 'player';
            const offensePlaybookName = offenseIsPlayer ? playerPlaybookName : aiPlaybookName;
            const offenseCoach = offenseIsPlayer ? playerCoach : aiCoach;
            const defenseCoach = offenseIsPlayer ? aiCoach : playerCoach;
            const buildAIContext = (forOffense) => ({
                state,
                charts: charts,
                coach: forOffense ? offenseCoach : defenseCoach,
                deckName: offensePlaybookName,
                playerIsHome: true,
                rng,
                getOffenseHand: () => [
                    { id: 'wc-quick-slant', label: 'Quick Slant', type: 'pass' },
                    { id: 'wc-screen-pass', label: 'Screen Pass', type: 'pass' },
                    { id: 'sm-power-o', label: 'Power O', type: 'run' },
                    { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' },
                ],
                getDefenseOptions: () => ['Goal Line', 'Cover 2', 'Blitz', 'Prevent'],
                isTwoMinute: (q, clock) => ((q === 2 || q === 4) && clock <= 120),
                getWhiteSignRestriction: (label) => null, // No restrictions in dice engine
                getFieldGoalAttemptYards: (st) => {
                    const offenseIsHome = (st.possession === 'player');
                    const yardsToOpp = offenseIsHome ? (100 - st.ballOn) : st.ballOn;
                    return yardsToOpp + 17;
                },
                tendencies,
            });
            // currentOffenseDeck removed - using static dice engine data
            const aiOff = buildAIContext(true);
            const aiDef = buildAIContext(false);
            let offDecision;
            if (state.down === 4) {
                offDecision = chooseOffense(aiOff);
            }
            else {
                const pc = offenseIsPlayer ? pcPlayer : pcAI;
                const picked = pc.choose_offense_play(state, offensePlaybookName);
                offDecision = { kind: 'play', deckName: picked.deckName, playLabel: picked.playLabel };
            }
            const pcForDef = offenseIsPlayer ? pcAI : pcPlayer;
            const defPicked = pcForDef.choose_defense_play(state);
            const defDecision = { kind: 'defense', label: defPicked.label };
            // Capture pre-snap state and labels for dev-mode log prefixing
            lastPreState = { ...state };
            lastOffLabel = offDecision.playLabel || (offDecision.kind === 'fieldGoal' ? 'Field Goal' : (offDecision.kind === 'punt' ? 'Punt' : ''));
            lastDefLabel = defDecision.label;
            if (offDecision.kind === 'fieldGoal') {
                const fg = (runtimeFlow ? runtimeFlow.attemptFieldGoal(state, offDecision.attemptYards, offenseIsPlayer ? 'player' : 'ai') : flow.attemptFieldGoal(state, offDecision.attemptYards, offenseIsPlayer ? 'player' : 'ai'));
                state = fg.state;
                translate(fg.events || []);
            }
            else if (offDecision.kind === 'punt') {
                const res = resolveSnap(state, { deckName: offensePlaybookName, playLabel: 'Punt (4th Down Only)', defenseLabel: defDecision.label });
                const choice = (res.events || []).find((e) => e.type === 'choice-required' && e.choice === 'penaltyAcceptDecline');
                if (choice && flow?.finalizePenaltyDecision) {
                    const data = choice.data || {};
                    const a = data.accepted;
                    const d = data.declined;
                    const aScore = evaluateStateForPlayer(a);
                    const dScore = evaluateStateForPlayer(d);
                    const decision = aScore >= dScore ? 'accept' : 'decline';
                    const chosen = decision === 'accept' ? a : d;
                    const fin = flow.finalizePenaltyDecision(chosen, decision, data.meta);
                    state = fin.state;
                    translate([...res.events, ...fin.events]);
                }
                else {
                    state = res.state;
                    translate(res.events || []);
                }
            }
            else {
                const before = { ...state };
                const res = resolveSnap(state, { deckName: offensePlaybookName, playLabel: offDecision.playLabel, defenseLabel: defDecision.label });
                const choice = (res.events || []).find((e) => e.type === 'choice-required' && e.choice === 'penaltyAcceptDecline');
                if (choice && flow?.finalizePenaltyDecision) {
                    const data = choice.data || {};
                    const a = data.accepted;
                    const d = data.declined;
                    const aScore = evaluateStateForPlayer(a);
                    const dScore = evaluateStateForPlayer(d);
                    const decision = aScore >= dScore ? 'accept' : 'decline';
                    const chosen = decision === 'accept' ? a : d;
                    const fin = flow.finalizePenaltyDecision(chosen, decision, data.meta);
                    try {
                        if (offenseIsPlayer) {
                            const playType = (/pass/i.test(offDecision.playLabel) ? 'pass' : 'run');
                            tendencies.record('player', playType, {
                                down: state.down,
                                toGo: state.toGo,
                                ballOnFromHome: state.ballOn,
                                playerIsHome: true,
                                possessing: state.possession,
                            });
                        }
                    }
                    catch { }
                    try {
                        pcPlayer.add_observation(before, offDecision.playLabel, defDecision.label);
                        pcAI.add_observation(before, offDecision.playLabel, defDecision.label);
                        pcPlayer.stepDecay();
                        pcAI.stepDecay();
                    }
                    catch { }
                    state = fin.state;
                    translate([...res.events, ...fin.events]);
                }
                else {
                    try {
                        if (offenseIsPlayer) {
                            const playType = (/pass/i.test(offDecision.playLabel) ? 'pass' : 'run');
                            tendencies.record('player', playType, {
                                down: state.down,
                                toGo: state.toGo,
                                ballOnFromHome: state.ballOn,
                                playerIsHome: true,
                                possessing: state.possession,
                            });
                        }
                    }
                    catch { }
                    try {
                        pcPlayer.add_observation(before, offDecision.playLabel, defDecision.label);
                        pcAI.add_observation(before, offDecision.playLabel, defDecision.label);
                        pcPlayer.stepDecay();
                        pcAI.stepDecay();
                    }
                    catch { }
                    state = res.state;
                    translate(res.events || []);
                }
            }
            await sleepFrame();
        }
    }
    catch (e) {
        bus.emit('log', { message: `DEV: Error in startTestGame: ${e?.message || e}` });
    }
}
//# sourceMappingURL=startTestGame.js.map