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

let uiRegistered = false;
const bus = new EventBus();
let tables: TablesState = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };

async function ensureUIRegistered(): Promise<void> {
  if (uiRegistered) return;
  try { (await import('./ui/HUD')).registerHUD(bus); } catch {}
  try { (await import('./ui/Log')).registerLog(bus); } catch {}
  try { (await import('./ui/Field')).registerField(bus); } catch {}
  try { (await import('./ui/Hand')).registerHand(bus); } catch {}
  uiRegistered = true;
}

async function preloadTables(): Promise<void> {
  try {
    const loaders = await import('./data/loaders/tables');
    const [offenseCharts, placeKicking, timeKeeping, longGain] = await Promise.all([
      loaders.loadOffenseCharts(),
      loaders.loadPlaceKicking(),
      loaders.loadTimeKeeping(),
      loaders.loadLongGain(),
    ]);
    tables = {
      offenseCharts: offenseCharts ?? null,
      placeKicking: placeKicking ?? null,
      timeKeeping: timeKeeping ?? null,
      longGain: longGain ?? null,
    };
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
  },
};

declare global {
  interface Window { GS?: GameRuntime }
}

if (typeof window !== 'undefined' && !window.GS) {
  window.GS = runtime;
}

