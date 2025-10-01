import { createInitialGameState } from '../../domain/GameState';
import { GameFlow } from '../../flow/GameFlow';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from '../../data/decks';
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
    const deckNames = ['Pro Style', 'Ball Control', 'Aerial Style'];
    const randomDeck = () => deckNames[Math.floor((rng() * deckNames.length))];
    const playerDeck = (opts.playerDeck && deckNames.includes(opts.playerDeck)) ? opts.playerDeck : randomDeck();
    const aiDeck = (opts.aiDeck && deckNames.includes(opts.aiDeck)) ? opts.aiDeck : randomDeck();
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
        getOffenseHand: () => currentOffenseDeck.map((c) => ({ id: c.id, label: c.label, type: c.type })),
        getDefenseOptions: () => DEFENSE_DECK.map(d => d.label),
        getWhiteSignRestriction: (label) => WHITE_SIGN_RESTRICTIONS[label] ?? null,
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
        const offenseDeckName = offenseIsPlayer ? playerDeck : aiDeck;
        const offenseDeck = OFFENSE_DECKS[offenseDeckName] || OFFENSE_DECKS['Pro Style'];
        const offenseCoach = offenseIsPlayer ? playerCoach : aiCoach;
        const defenseCoach = offenseIsPlayer ? aiCoach : playerCoach;
        const buildAIContext = (forOffense) => ({
            state,
            charts: charts,
            coach: forOffense ? offenseCoach : defenseCoach,
            deckName: offenseDeckName,
            playerIsHome: true,
            rng,
            getOffenseHand: () => offenseDeck.map(c => ({ id: c.id, label: c.label, type: c.type })),
            getDefenseOptions: () => DEFENSE_DECK.map(d => d.label),
            isTwoMinute: (q, clock) => ((q === 2 || q === 4) && clock <= 120),
            getWhiteSignRestriction: (label) => WHITE_SIGN_RESTRICTIONS[label] ?? null,
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