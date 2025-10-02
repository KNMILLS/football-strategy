import { createInitialGameState } from '../../domain/GameState';
import { GameFlow } from '../../flow/GameFlow';
// Card system removed - using dice engine only
import * as CoachProfiles from '../../ai/CoachProfiles';
import { chooseOffense, chooseKickoff, PlayerTendenciesMemory } from '../../ai/Playcall';
import { PlayCaller } from '../../ai/PlayCaller';
export async function runHeadlessSim(seed, opts) {
    const { charts, rng, timeKeeping, policy } = opts;
    const flow = new GameFlow({ charts, rng, timeKeeping, policy });
    let state = createInitialGameState(seed);
    state.possession = (rng() < 0.5 ? 'player' : 'ai');
    const events = [];
    const push = (evs) => { events.push(...evs); };
    const playbookNames = ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'];
    const randomPlaybook = () => playbookNames[Math.floor((rng() * playbookNames.length))];
    const playerPlaybook = (opts.playerPlaybook && playbookNames.includes(opts.playerPlaybook)) ? opts.playerPlaybook : randomPlaybook();
    const aiPlaybook = (opts.aiPlaybook && playbookNames.includes(opts.aiPlaybook)) ? opts.aiPlaybook : randomPlaybook();
    const coachKeys = Object.keys(CoachProfiles);
    const pickCoach = () => {
        const idx = Math.floor(rng() * Math.max(1, coachKeys.length));
        const key = coachKeys[Math.min(idx, Math.max(0, coachKeys.length - 1))];
        return (key ? CoachProfiles[key] : CoachProfiles[coachKeys[0]]);
    };
    const playerCoach = (opts.playerCoach && CoachProfiles[opts.playerCoach]) ? CoachProfiles[opts.playerCoach] : pickCoach();
    const aiCoach = (opts.aiCoach && CoachProfiles[opts.aiCoach]) ? CoachProfiles[opts.aiCoach] : pickCoach();
    {
        const kicking = state.possession === 'player' ? 'ai' : 'player';
        const koDecision = chooseKickoff({ state, coach: (kicking === 'player' ? playerCoach : aiCoach), rng });
        const ko = flow.performKickoff(state, koDecision?.type === 'onside' ? 'onside' : 'normal', kicking);
        state = ko.state;
        push(ko.events || []);
    }
    const tendencies = new PlayerTendenciesMemory();
    let currentOffenseDeck = [];
    const deps = {
        charts,
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
    const MAX_SNAPS = 400;
    for (let i = 0; i < MAX_SNAPS && !state.gameOver; i++) {
        const offenseIsPlayer = state.possession === 'player';
        const offensePlaybookName = offenseIsPlayer ? playerPlaybook : aiPlaybook;
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
        currentOffenseDeck = offenseDeck;
        const aiOff = buildAIContext(true);
        const aiDef = buildAIContext(false);
        const before = { ...state };
        let offDecision;
        if (state.down === 4) {
            offDecision = chooseOffense(aiOff);
        }
        else {
            const pc = offenseIsPlayer ? pcPlayer : pcAI;
            const picked = pc.choose_offense_play(state, offenseDeckName);
            offDecision = { kind: 'play', deckName: picked.deckName, playLabel: picked.playLabel };
        }
        const pcForDef = offenseIsPlayer ? pcAI : pcPlayer;
        const defPicked = pcForDef.choose_defense_play(state);
        const defDecision = { kind: 'defense', label: defPicked.label };
        if (offDecision.kind === 'fieldGoal') {
            const fg = flow.attemptFieldGoal(state, offDecision.attemptYards, offenseIsPlayer ? 'player' : 'ai');
            state = fg.state;
            push(fg.events || []);
        }
        else if (offDecision.kind === 'punt') {
            const res = flow.resolveSnap(state, { deckName: offenseDeckName, playLabel: 'Punt (4th Down Only)', defenseLabel: defDecision.label });
            state = res.state;
            push(res.events || []);
        }
        else {
            const res = flow.resolveSnap(state, { deckName: offenseDeckName, playLabel: offDecision.playLabel, defenseLabel: defDecision.label });
            state = res.state;
            push(res.events || []);
        }
        try {
            if (offDecision.kind !== 'fieldGoal') {
                pcPlayer.add_observation(before, offDecision.playLabel || 'Punt (4th Down Only)', defDecision.label);
                pcAI.add_observation(before, offDecision.playLabel || 'Punt (4th Down Only)', defDecision.label);
            }
            pcPlayer.stepDecay();
            pcAI.stepDecay();
        }
        catch { }
    }
    if (!events.some(e => e.type === 'final')) {
        events.push({ type: 'final', payload: { score: state.score } });
    }
    return { state, events };
}
//# sourceMappingURL=headless.js.map