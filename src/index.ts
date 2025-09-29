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
import type { ResolveInput as CoreResolveInput } from './rules/ResolvePlayCore';
import { EventBus } from './utils/EventBus';
import type { GameRuntime, TablesState } from './runtime/types';
import { GameFlow, type FlowEvent, type PlayInput } from './flow/GameFlow';
import { createLCG } from './sim/RNG';
import { validateOffensePlay, canAttemptFieldGoal } from './rules/PlayValidation';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from './data/decks';

let uiRegistered = false;
const bus = new EventBus();
let tables: TablesState = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };

async function ensureUIRegistered(): Promise<void> {
  if (uiRegistered) return;
  try { (await import('./ui/HUD')).registerHUD(bus); } catch {}
  try { (await import('./ui/Log')).registerLog(bus); } catch {}
  try { (await import('./ui/Field')).registerField(bus); } catch {}
  try { (await import('./ui/Hand')).registerHand(bus); } catch {}
  try { (await import('./ui/Controls')).registerControls(bus); } catch {}
  try { (await import('./ui/DevMode')).registerDevMode(bus); } catch {}
  try { (await import('./ui/SpecialTeamsUI')).registerSpecialTeamsUI(bus); } catch {}
  try { (await import('./ui/PenaltyUI')).registerPenaltyUI(bus); } catch {}
  try { (await import('./ui/VFX')).registerVFX(bus); } catch {}
  try { (await import('./ui/SFX')).registerSFX(bus); } catch {}
  try { (await import('./qa/Harness')).registerQAHarness(bus); } catch {}
  uiRegistered = true;
}

async function preloadTables(): Promise<void> {
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
  } catch {
    tables = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
  }
  if (typeof window !== 'undefined' && window.GS) {
    window.GS.tables = tables;
  }
}

function setTheme(theme: string): void {
  if (typeof document === 'undefined') return;
  (document.body as any).dataset.theme = theme;
}

// Bridge UI theme change events to body dataset
bus.on('ui:themeChanged', ({ theme }: any) => {
  try { setTheme(theme); } catch {}
});

async function start(options?: { theme?: 'arcade'|'minimalist'|'retro'|'board'|'vintage'|'modern' }): Promise<void> {
  if (typeof window === 'undefined') return;
  await ensureUIRegistered();
  if (options && options.theme) setTheme(options.theme);
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
  } as any);
}

function dispose(): void {
  // No timers yet; leave bus listeners intact for now. Future timers/intervals cleared here.
}

const runtime: GameRuntime = {
  bus,
  rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain },
  ai: { PATDecision, CoachProfiles },
  tables,
  start,
  dispose,
  setTheme,
  runtime: {
    resolvePlayAdapter: (params: {
      state: CoreResolveInput['state'];
      charts: CoreResolveInput['charts'];
      deckName: CoreResolveInput['deckName'];
      playLabel: CoreResolveInput['playLabel'];
      defenseLabel: CoreResolveInput['defenseLabel'];
      rng: CoreResolveInput['rng'];
      ui?: { inTwoMinute?: boolean };
    }) => {
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
        clock: (params as any).state.clock,
        score: { ...(params as any).state.score },
        awaitingPAT: (params as any).state.awaitingPAT,
        gameOver: (params as any).state.gameOver,
      } as any;
      const events: Array<{ type: string; data?: any }> = [];
      if ((res as any).possessionChanged) events.push({ type: 'possessionChanged' });
      if ((res as any).touchdown) events.push({ type: 'touchdown' });
      if ((res as any).safety) events.push({ type: 'safety' });
      return { nextState, outcome: (res as any).outcome, events } as any;
    },
    createFlow: (seed?: number) => {
      const rng = createLCG(seed ?? 12345);
      if (!tables.offenseCharts) throw new Error('Offense charts not loaded');
      const flow = new GameFlow({ charts: tables.offenseCharts, rng });
      let flowState: import('./domain/GameState').GameState | null = null;
      let pendingPenalty: { accepted: import('./domain/GameState').GameState; declined: import('./domain/GameState').GameState; meta: any } | null = null;
      const translate = (events: FlowEvent[]) => {
        for (const ev of events) {
          if (ev.type === 'hud') bus.emit('hudUpdate', ev.payload as any);
          else if (ev.type === 'log') {
            bus.emit('log', { message: ev.message });
            if (/Field goal missed/i.test(ev.message)) {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'NO GOOD' });
              (bus as any).emit && (bus as any).emit('sfx:crowd', { kind: 'groan' });
            }
          }
          else if (ev.type === 'vfx') {
            const kind = ev.payload.kind;
            if (kind === 'td') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
              (bus as any).emit && (bus as any).emit('vfx:flash', {});
              (bus as any).emit && (bus as any).emit('sfx:crowd', { kind: 'cheer' });
            } else if (kind === 'interception') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'INTERCEPTION!' });
              (bus as any).emit && (bus as any).emit('vfx:shake', { selector: 'body' });
              (bus as any).emit && (bus as any).emit('sfx:hit', {});
            } else if (kind === 'twoMinute') {
              (bus as any).emit && (bus as any).emit('vfx:flash', {});
            }
            bus.emit('vfx', { type: kind, payload: ev.payload.data });
          }
          else if (ev.type === 'choice-required') {
            (bus as any).emit('flow:choiceRequired', { choice: ev.choice, data: ev.data });
            if (ev.choice === 'penaltyAcceptDecline') {
              const d: any = ev.data || {};
              pendingPenalty = { accepted: d.accepted, declined: d.declined, meta: d.meta };
            }
          }
          else if (ev.type === 'final') bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
          else if (ev.type === 'halftime') bus.emit('log', { message: 'Halftime' });
          else if (ev.type === 'endOfQuarter') bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
          else if (ev.type === 'score') {
            bus.emit('log', { message: `Score: ${ev.payload.kind}` });
            (bus as any).emit && (bus as any).emit('vfx:scorePop', {});
            if (ev.payload.kind === 'FG') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'FIELD GOAL!' });
              (bus as any).emit && (bus as any).emit('sfx:beep', { freq: 880, type: 'triangle' });
            } else if (ev.payload.kind === 'Safety') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'SAFETY!', gold: true });
              (bus as any).emit && (bus as any).emit('sfx:beep', { freq: 220, type: 'square' });
            } else if (ev.payload.kind === 'TD') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
              (bus as any).emit && (bus as any).emit('sfx:crowd', { kind: 'cheer' });
            }
          }
        }
      };
      (bus as any).on && (bus as any).on('ui:choice.penalty', (p: { decision: 'accept'|'decline' }) => {
        if (!pendingPenalty) return;
        const ctx = pendingPenalty;
        const chosen = p.decision === 'accept' ? ctx.accepted : ctx.declined;
        const fin = (flow as any).finalizePenaltyDecision(chosen, p.decision, ctx.meta);
        flowState = fin.state as any;
        translate(fin.events);
        pendingPenalty = null;
      });
      return {
        resolveSnap: (state: import('./domain/GameState').GameState, input: PlayInput) => {
          const res = flow.resolveSnap(state, input);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        applyPenaltyDecision: (state: import('./domain/GameState').GameState, decision: 'accept'|'decline', context: { accepted: import('./domain/GameState').GameState; declined: import('./domain/GameState').GameState; meta: any }) => {
          const chosen = decision === 'accept' ? context.accepted : context.declined;
          const fin = (flow as any).finalizePenaltyDecision(chosen, decision, context.meta);
          translate(fin.events);
          flowState = fin.state as any;
          return fin;
        },
        resolvePATAndRestart: (state: import('./domain/GameState').GameState, side: 'player'|'ai') => {
          const res = flow.resolvePATAndRestart(state, side);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        attemptFieldGoal: (state: import('./domain/GameState').GameState, attemptYards: number, side: 'player'|'ai') => {
          const res = flow.attemptFieldGoal(state, attemptYards, side);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        resolveSafetyRestart: (state: import('./domain/GameState').GameState, conceding: 'player'|'ai') => {
          const res = flow.resolveSafetyRestart(state, conceding);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        performKickoff: (state: import('./domain/GameState').GameState, type: 'normal'|'onside', kicking: 'player'|'ai') => {
          const res = flow.performKickoff(state, type, kicking);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        inner: flow,
      } as any;
    },
  },
};

declare global {
  interface Window { GS?: GameRuntime }
}

if (typeof window !== 'undefined' && !window.GS) {
  window.GS = runtime;
}

// Ensure no legacy bridge remains; runtime boots purely via TS modules.

