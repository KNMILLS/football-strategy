import { createInitialGameState, type GameState, type TeamSide } from '../../domain/GameState';
import type { RNG } from '../RNG';
import { GameFlow, type FlowEvent, type PlayInput } from '../../flow/GameFlow';
import type { OffenseCharts } from '../../data/schemas/OffenseCharts';
import type { TimeKeeping } from '../../data/schemas/Timekeeping';
// Card system removed - using dice engine only
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
  playerPlaybook?: string | undefined;
  aiPlaybook?: string | undefined;
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

  const playbookNames: string[] = ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'];
  const randomPlaybook = (): string => playbookNames[Math.floor((rng() * playbookNames.length))]!;
  const playerPlaybook: string = (opts.playerPlaybook && playbookNames.includes(opts.playerPlaybook)) ? opts.playerPlaybook : randomPlaybook();
  const aiPlaybook: string = (opts.aiPlaybook && playbookNames.includes(opts.aiPlaybook)) ? opts.aiPlaybook : randomPlaybook();
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
    getOffenseHand: () => [
      { id: 'wc-quick-slant', label: 'Quick Slant', type: 'pass' },
      { id: 'wc-screen-pass', label: 'Screen Pass', type: 'pass' },
      { id: 'sm-power-o', label: 'Power O', type: 'run' },
      { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' },
    ],
    getDefenseOptions: () => ['Goal Line', 'Cover 2', 'Blitz', 'Prevent'],
    getWhiteSignRestriction: (label: string) => null, // No restrictions in dice engine
  } as const;
  const pcPlayer = new PlayCaller(deps as any, true);
  const pcAI = new PlayCaller(deps as any, true);
  try { await pcPlayer.loadPersonality(); await pcAI.loadPersonality(); } catch {}
  pcPlayer.reset(seed);
  pcAI.reset(seed + 1);
  const MAX_SNAPS = 400;
  for (let i = 0; i < MAX_SNAPS && !state.gameOver; i++) {
    const offenseIsPlayer = state.possession === 'player';
    const offensePlaybookName = offenseIsPlayer ? playerPlaybook : aiPlaybook;
    const offenseCoach = offenseIsPlayer ? playerCoach : aiCoach;
    const defenseCoach = offenseIsPlayer ? aiCoach : playerCoach;

    const buildAIContext = (forOffense: boolean): AIContext => ({
      state,
      charts: charts!,
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
      isTwoMinute: (q: number, clock: number) => ((q === 2 || q === 4) && clock <= 120),
      getWhiteSignRestriction: (label: string) => null, // No restrictions in dice engine
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



