import type { EventBus } from '../../utils/EventBus';
import { createLCG } from '../../sim/RNG';
import { GameFlow } from '../../flow/GameFlow';
import { OFFENSE_DECKS, DEFENSE_DECK, type DeckName, WHITE_SIGN_RESTRICTIONS } from '../../data/decks';
import type { GameState } from '../../domain/GameState';
import * as CoachProfiles from '../../ai/CoachProfiles';
import { chooseOffense, chooseKickoff, type AIContext, PlayerTendenciesMemory } from '../../ai/Playcall';
import { PlayCaller } from '../../ai/PlayCaller';
import { sleepFrame } from '../util/dom';
import { pushDebugEntry, resetDebugEntries, setDebugSeed } from '../debug/buffer';

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }

function initializeState(seed: number, opts?: Partial<Pick<GameState, 'possession'|'ballOn'|'down'|'toGo'|'quarter'|'clock'>>): GameState {
  const s: GameState = {
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
  } as any;
  const o = opts || {};
  if (o.possession) s.possession = o.possession;
  if (typeof o.ballOn === 'number') s.ballOn = clamp(o.ballOn, 1, 99);
  if (typeof o.down === 'number') s.down = clamp(o.down, 1, 4);
  if (typeof o.toGo === 'number') s.toGo = clamp(o.toGo, 1, 30);
  if (typeof o.quarter === 'number') s.quarter = clamp(o.quarter, 1, 4);
  if (typeof o.clock === 'number') s.clock = clamp(o.clock, 0, 15 * 60);
  return s;
}

export async function startTestGame(bus: EventBus, p: any): Promise<void> {
  try {
    const seed = typeof p.seed === 'number' ? p.seed : Math.floor(Math.random() * 1e9);
    const rng = createLCG(seed);
    resetDebugEntries();
    setDebugSeed(seed);
    const charts = (globalThis as any).GS?.tables?.offenseCharts;
    const runtimeFlow: any = null;
    const deckNameFrom = (s: any): DeckName => (s === 'Ball Control' || s === 'Aerial Style' || s === 'Pro Style') ? s : 'Pro Style';
    const deckNames: DeckName[] = ['Pro Style', 'Ball Control', 'Aerial Style'];
    const randomDeck = (): DeckName => deckNames[Math.floor(rng() * deckNames.length)]!;
    const playerDeckName: DeckName = deckNameFrom((p as any)?.playerDeck) || randomDeck();
    const aiDeckName: DeckName = deckNameFrom((p as any)?.aiDeck) || randomDeck();
    const playerDeck = OFFENSE_DECKS[playerDeckName] || OFFENSE_DECKS['Pro Style'];
    const aiDeck = OFFENSE_DECKS[aiDeckName] || OFFENSE_DECKS['Pro Style'];
    const coachKeys = Object.keys(CoachProfiles) as Array<keyof typeof CoachProfiles>;
    const pickCoach = () => (CoachProfiles as any)[coachKeys[Math.floor(rng() * coachKeys.length)] as any];
    const playerCoach = (p as any)?.playerCoach && (CoachProfiles as any)[(p as any)?.playerCoach] ? (CoachProfiles as any)[(p as any)?.playerCoach] : pickCoach();
    const aiCoach = (p as any)?.aiCoach && (CoachProfiles as any)[(p as any)?.aiCoach] ? (CoachProfiles as any)[(p as any)?.aiCoach] : pickCoach();

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
    const kicking: 'player'|'ai' = state.possession === 'player' ? 'ai' : 'player';
    const performKickoff = (s: any, type: 'normal'|'onside', k: 'player'|'ai') => (runtimeFlow ? runtimeFlow.performKickoff(s, type, k) : (flow as any).performKickoff(s, type, k));
    const resolveSnap = (s: any, input: any) => (runtimeFlow ? runtimeFlow.resolveSnap(s, input) : (flow as any).resolveSnap(s, input));

    // Dev-mode helpers for prefixed commentary
    const isDevModeOn = (): boolean => {
      try { if (typeof localStorage !== 'undefined') return localStorage.getItem('gs_dev_mode') === '1'; } catch {}
      try { return !!(globalThis as any).GS?.__devMode?.enabled; } catch {}
      return false;
    };
    const formatClock = (seconds: number): string => {
      const s = Math.max(0, Math.floor(seconds));
      const mPart = Math.floor(s / 60);
      const sPart = (s % 60).toString().padStart(2, '0');
      return `${mPart}:${sPart}`;
    };
    const buildPlayPrefix = (s: GameState, offLabel: string, defLabel: string): string => {
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
    let lastPreState: GameState | null = null;
    let lastOffLabel: string = '';
    let lastDefLabel: string = '';

    const translate = (events: any[]) => {
      for (const ev of events || []) {
        if (ev.type === 'hud') bus.emit('hudUpdate', ev.payload as any);
        else if (ev.type === 'log') {
          const dev = isDevModeOn();
          if (dev && lastPreState && lastOffLabel && lastDefLabel && /^Brad:/.test(String(ev.message || ''))) {
            const pref = buildPlayPrefix(lastPreState, lastOffLabel, lastDefLabel);
            bus.emit('log', { message: `${pref} — ${ev.message}` });
          } else {
            bus.emit('log', { message: ev.message });
          }
        }
        else if (ev.type === 'final') bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
        else if (ev.type === 'halftime') bus.emit('log', { message: 'Halftime' });
        else if (ev.type === 'endOfQuarter') bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
        else if (ev.type === 'score') {
          bus.emit('log', { message: `Score: ${ev.payload.kind}` });
        }
      }
    };

    function evaluateStateForPlayer(s: GameState): number {
      const scoreDiff = s.score.player - s.score.ai;
      let val = scoreDiff * 1000;
      if (s.possession === 'player') {
        val += s.ballOn;
        val += (5 - s.down) * 2;
        val += (10 - s.toGo);
      } else {
        val += (100 - s.ballOn);
        val += (s.down - 1) * 2;
        val += s.toGo;
      }
      return val;
    }

    try {
      const isDev = (() => {
        try { if (typeof localStorage !== 'undefined') return localStorage.getItem('gs_dev_mode') === '1'; } catch {}
        try { return !!(globalThis as any).GS?.__devMode?.enabled; } catch {}
        return false;
      })();
      if (isDev) {
        pushDebugEntry('GRIDIRON DEBUG PLAY LOG');
        pushDebugEntry(`Generated: ${new Date().toISOString()}`);
      }
    } catch {}

    const koDecision = chooseKickoff({ state, coach: (kicking === 'player' ? playerCoach : aiCoach), rng });
    const koRes = performKickoff(state, koDecision.type, kicking);
    state = koRes.state as any;
    translate(koRes.events || []);

    const tendencies = new PlayerTendenciesMemory();

    let currentOffenseDeck: any[] = [];
    const deps = {
      charts: charts!,
      getOffenseHand: () => currentOffenseDeck.map((c: any) => ({ id: c.id, label: c.label, type: c.type })),
      getDefenseOptions: () => DEFENSE_DECK.map(d => d.label) as any,
      getWhiteSignRestriction: (label: string) => (WHITE_SIGN_RESTRICTIONS as any)[label] ?? null,
    } as const;
    const pcPlayer = new PlayCaller(deps as any, true);
    const pcAI = new PlayCaller(deps as any, true);
    try { await pcPlayer.loadPersonality(); await pcAI.loadPersonality(); } catch {}
    pcPlayer.reset(seed);
    pcAI.reset(seed + 1);
    while (!state.gameOver) {
      const offenseIsPlayer = state.possession === 'player';
      const offenseDeckName = offenseIsPlayer ? playerDeckName : aiDeckName;
      const offenseDeck = offenseIsPlayer ? playerDeck : aiDeck;
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

      currentOffenseDeck = offenseDeck as any[];
      const aiOff = buildAIContext(true);
      const aiDef = buildAIContext(false);
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

      // Capture pre-snap state and labels for dev-mode log prefixing
      lastPreState = { ...state } as GameState;
      lastOffLabel = (offDecision as any).playLabel || (offDecision.kind === 'fieldGoal' ? 'Field Goal' : (offDecision.kind === 'punt' ? 'Punt' : ''));
      lastDefLabel = defDecision.label;

      if (offDecision.kind === 'fieldGoal') {
        const fg = (runtimeFlow ? runtimeFlow.attemptFieldGoal(state, (offDecision as any).attemptYards, offenseIsPlayer ? 'player' : 'ai') : (flow as any).attemptFieldGoal(state, (offDecision as any).attemptYards, offenseIsPlayer ? 'player' : 'ai'));
        state = fg.state as any;
        translate(fg.events || []);
      } else if (offDecision.kind === 'punt') {
        const res = resolveSnap(state, { deckName: offenseDeckName, playLabel: 'Punt (4th Down Only)', defenseLabel: defDecision.label });
        const choice = (res.events || []).find((e: any) => e.type === 'choice-required' && e.choice === 'penaltyAcceptDecline');
        if (choice && (flow as any)?.finalizePenaltyDecision) {
          const data = choice.data || {};
          const a = data.accepted as GameState; const d = data.declined as GameState;
          const aScore = evaluateStateForPlayer(a); const dScore = evaluateStateForPlayer(d);
          const decision: 'accept'|'decline' = aScore >= dScore ? 'accept' : 'decline';
          const chosen = decision === 'accept' ? a : d;
          const fin = (flow as any).finalizePenaltyDecision(chosen, decision, data.meta);
          state = fin.state as any;
          translate([...res.events, ...fin.events]);
        } else {
          state = res.state as any;
          translate(res.events || []);
        }
      } else {
        const before = { ...state };
        const res = resolveSnap(state, { deckName: offenseDeckName, playLabel: (offDecision as any).playLabel, defenseLabel: defDecision.label });
        const choice = (res.events || []).find((e: any) => e.type === 'choice-required' && e.choice === 'penaltyAcceptDecline');
        if (choice && (flow as any)?.finalizePenaltyDecision) {
          const data = choice.data || {};
          const a = data.accepted as GameState; const d = data.declined as GameState;
          const aScore = evaluateStateForPlayer(a); const dScore = evaluateStateForPlayer(d);
          const decision: 'accept'|'decline' = aScore >= dScore ? 'accept' : 'decline';
          const chosen = decision === 'accept' ? a : d;
          const fin = (flow as any).finalizePenaltyDecision(chosen, decision, data.meta);
          try {
            if (offenseIsPlayer) {
              const playType: 'run'|'pass' = (/pass/i.test((offDecision as any).playLabel) ? 'pass' : 'run');
              tendencies.record('player', playType, {
                down: state.down,
                toGo: state.toGo,
                ballOnFromHome: state.ballOn,
                playerIsHome: true,
                possessing: state.possession,
              });
            }
          } catch {}
          try { (pcPlayer as any).add_observation(before, (offDecision as any).playLabel, defDecision.label); (pcAI as any).add_observation(before, (offDecision as any).playLabel, defDecision.label); (pcPlayer as any).stepDecay(); (pcAI as any).stepDecay(); } catch {}
          state = fin.state as any;
          translate([...res.events, ...fin.events]);
        } else {
          try {
            if (offenseIsPlayer) {
              const playType: 'run'|'pass' = (/pass/i.test((offDecision as any).playLabel) ? 'pass' : 'run');
              tendencies.record('player', playType, {
                down: state.down,
                toGo: state.toGo,
                ballOnFromHome: state.ballOn,
                playerIsHome: true,
                possessing: state.possession,
              });
            }
          } catch {}
          try { (pcPlayer as any).add_observation(before, (offDecision as any).playLabel, defDecision.label); (pcAI as any).add_observation(before, (offDecision as any).playLabel, defDecision.label); (pcPlayer as any).stepDecay(); (pcAI as any).stepDecay(); } catch {}
          state = (res as any).state as any;
          translate((res as any).events || []);
        }
      }
      await sleepFrame();
    }
  } catch (e) {
    bus.emit('log', { message: `DEV: Error in startTestGame: ${(e as any)?.message || e}` });
  }
}


