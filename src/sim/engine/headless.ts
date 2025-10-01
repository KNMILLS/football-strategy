import { createInitialGameState, type GameState, type TeamSide } from '../../domain/GameState';
import type { RNG } from '../RNG';
import { GameFlow, type FlowEvent, type PlayInput } from '../../flow/GameFlow';
import type { OffenseCharts } from '../../data/schemas/OffenseCharts';
import type { TimeKeeping } from '../../data/schemas/Timekeeping';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS, type DeckName } from '../../data/decks';
import * as CoachProfiles from '../../ai/CoachProfiles';
import { chooseOffense, chooseKickoff, type AIContext, PlayerTendenciesMemory } from '../../ai/Playcall';
import { PlayCaller } from '../../ai/PlayCaller';

export interface HeadlessSimOptions {
  charts: OffenseCharts;
  rng: RNG;
  timeKeeping: TimeKeeping | {
    gain0to20: number; gain20plus: number; loss: number; outOfBounds: number; incomplete: number; interception: number; penalty: number; fumble: number; kickoff: number; fieldgoal: number; punt: number; extraPoint: number;
  };
  policy: { choosePAT: (ctx: { diff: number; quarter: number; clock: number; side: 'player'|'ai' }) => 'kick'|'two' };
  seed: number;
  playerDeck?: DeckName | undefined;
  aiDeck?: DeckName | undefined;
  playerCoach?: keyof typeof CoachProfiles | undefined;
  aiCoach?: keyof typeof CoachProfiles | undefined;
}

export async function runHeadlessSim(seed: number, opts: HeadlessSimOptions): Promise<{ state: GameState; events: FlowEvent[] }>{
  const { charts, rng, timeKeeping, policy } = opts;
  const flow = new GameFlow({ charts, rng, timeKeeping, policy });

  let state: GameState = createInitialGameState(seed);
  state.possession = (rng() < 0.5 ? 'player' : 'ai');
  const events: FlowEvent[] = [];
  const push = (evs: FlowEvent[]) => { events.push(...evs); };

  const deckNames: DeckName[] = ['Pro Style', 'Ball Control', 'Aerial Style'];
  const randomDeck = (): DeckName => deckNames[Math.floor((rng() * deckNames.length))]!;
  const playerDeck: DeckName = (opts.playerDeck && deckNames.includes(opts.playerDeck)) ? opts.playerDeck : randomDeck();
  const aiDeck: DeckName = (opts.aiDeck && deckNames.includes(opts.aiDeck)) ? opts.aiDeck : randomDeck();
  const coachKeys = Object.keys(CoachProfiles) as Array<keyof typeof CoachProfiles>;
  const pickCoach = () => {
    const idx = Math.floor(rng() * Math.max(1, coachKeys.length));
    const key = coachKeys[Math.min(idx, Math.max(0, coachKeys.length - 1))];
    return (key ? CoachProfiles[key] : CoachProfiles[coachKeys[0]!]) as any;
  };
  const playerCoach = (opts.playerCoach && CoachProfiles[opts.playerCoach]) ? CoachProfiles[opts.playerCoach] : pickCoach();
  const aiCoach = (opts.aiCoach && CoachProfiles[opts.aiCoach]) ? CoachProfiles[opts.aiCoach] : pickCoach();

  {
    const kicking: TeamSide = state.possession === 'player' ? 'ai' : 'player';
    const koDecision = chooseKickoff({ state, coach: (kicking === 'player' ? playerCoach : aiCoach), rng } as any);
    const ko = (flow as any).performKickoff(state, koDecision?.type === 'onside' ? 'onside' : 'normal', kicking);
    state = ko.state as any; push(ko.events || []);
  }

  const tendencies = new PlayerTendenciesMemory();
  let currentOffenseDeck: any[] = [];
  const deps = {
    charts,
    getOffenseHand: () => currentOffenseDeck.map((c: any) => ({ id: c.id, label: c.label, type: c.type })),
    getDefenseOptions: () => DEFENSE_DECK.map(d => d.label),
    getWhiteSignRestriction: (label: string) => (WHITE_SIGN_RESTRICTIONS as any)[label] ?? null,
  } as const;
  const pcPlayer = new PlayCaller(deps as any, true);
  const pcAI = new PlayCaller(deps as any, true);
  try { await pcPlayer.loadPersonality(); await pcAI.loadPersonality(); } catch {}
  pcPlayer.reset(seed);
  pcAI.reset(seed + 1);
  const MAX_SNAPS = 400;
  for (let i = 0; i < MAX_SNAPS && !state.gameOver; i++) {
    const offenseIsPlayer = state.possession === 'player';
    const offenseDeckName = offenseIsPlayer ? playerDeck : aiDeck;
    const offenseDeck = OFFENSE_DECKS[offenseDeckName] || OFFENSE_DECKS['Pro Style'];
    const offenseCoach = offenseIsPlayer ? playerCoach : aiCoach;
    const defenseCoach = offenseIsPlayer ? aiCoach : playerCoach;

    const buildAIContext = (forOffense: boolean): AIContext => ({
      state,
      charts: charts!,
      coach: forOffense ? offenseCoach : defenseCoach,
      deckName: offenseDeckName,
      playerIsHome: true,
      rng,
      getOffenseHand: () => offenseDeck.map(c => ({ id: c.id, label: c.label, type: c.type } as any)),
      getDefenseOptions: () => DEFENSE_DECK.map(d => d.label) as any,
      isTwoMinute: (q: number, clock: number) => ((q === 2 || q === 4) && clock <= 120),
      getWhiteSignRestriction: (label: string) => (WHITE_SIGN_RESTRICTIONS as any)[label] ?? null,
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
    let offDecision: ReturnType<typeof chooseOffense>;
    if (state.down === 4) {
      offDecision = chooseOffense(aiOff);
    } else {
      const pc = offenseIsPlayer ? pcPlayer : pcAI;
      const picked = pc.choose_offense_play(state, offenseDeckName);
      offDecision = { kind: 'play', deckName: picked.deckName, playLabel: picked.playLabel } as any;
    }
    const pcForDef = offenseIsPlayer ? pcAI : pcPlayer;
    const defPicked = pcForDef.choose_defense_play(state);
    const defDecision = { kind: 'defense', label: defPicked.label } as any;

    if (offDecision.kind === 'fieldGoal') {
      const fg = (flow as any).attemptFieldGoal(state, offDecision.attemptYards, offenseIsPlayer ? 'player' : 'ai');
      state = fg.state as any; push(fg.events || []);
    } else if (offDecision.kind === 'punt') {
      const res = (flow as any).resolveSnap(state, { deckName: offenseDeckName, playLabel: 'Punt (4th Down Only)', defenseLabel: defDecision.label } as PlayInput);
      state = res.state as any; push(res.events || []);
    } else {
      const res = (flow as any).resolveSnap(state, { deckName: offenseDeckName, playLabel: offDecision.playLabel, defenseLabel: defDecision.label } as PlayInput);
      state = res.state as any; push(res.events || []);
    }
    try {
      if (offDecision.kind !== 'fieldGoal') {
        pcPlayer.add_observation(before as any, (offDecision as any).playLabel || 'Punt (4th Down Only)', defDecision.label);
        pcAI.add_observation(before as any, (offDecision as any).playLabel || 'Punt (4th Down Only)', defDecision.label);
      }
      pcPlayer.stepDecay(); pcAI.stepDecay();
    } catch {}
  }

  if (!events.some(e => e.type === 'final')) {
    (events as any).push({ type: 'final', payload: { score: state.score } });
  }

  return { state, events };
}



