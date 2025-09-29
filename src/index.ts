// Bootstrap: expose extracted modules for gradual integration
import * as Kickoff from './rules/special/Kickoff';
import * as Punt from './rules/special/Punt';
import * as PlaceKicking from './rules/special/PlaceKicking';
import * as ResultParsing from './rules/ResultParsing';
import * as Timekeeping from './rules/Timekeeping';
import * as Charts from './rules/Charts';
import * as RNG from './sim/RNG';
import * as PATDecision from './ai/PATDecision';
import * as CoachProfiles from './ai/CoachProfiles';
import { resolvePlayCore } from './rules/ResolvePlayCore';
import type { ResolveInput as CoreResolveInput } from './rules/ResolvePlayCore';
// Optional UI bootstrap and data preloads; during tests and legacy runtime these may be absent
// so keep these imports narrow or behind try/catch when used.
// We avoid hard imports for UI and tables to keep build flexible.

export function boot(): void {
  // Placeholder bootstrap for future DOM wiring
}

declare global {
  interface Window { GS?: any }
}

if (typeof window !== 'undefined') {
  const bus = new (await import('./utils/EventBus')).EventBus();
  try { (await import('./ui/HUD')).registerHUD(bus); } catch {}
  try { (await import('./ui/Log')).registerLog(bus); } catch {}
  try { (await import('./ui/Field')).registerField(bus); } catch {}
  try { (await import('./ui/Hand')).registerHand(bus); } catch {}

  let offenseCharts: any = null, placeKicking: any = null, timeKeeping: any = null, longGain: any = null;
  try {
    const tables = await import('./data/loaders/tables');
    [offenseCharts, placeKicking, timeKeeping, longGain] = await Promise.all([
      tables.loadOffenseCharts(), tables.loadPlaceKicking(), tables.loadTimeKeeping(), tables.loadLongGain(),
    ]);
  } catch {}

  (window as any).GS = {
    rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain: (await import('./rules/LongGain')) },
    ai: { PATDecision, CoachProfiles },
    sim: { RNG },
    tables: { offenseCharts, placeKicking, timeKeeping, longGain },
    bus,
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
        // Do not advance clock/score here; legacy UI handles two-minute and PAT/FG flows
        const nextState = {
          ...res.state,
          clock: params.state.clock,
          score: { ...params.state.score },
          awaitingPAT: params.state.awaitingPAT,
          gameOver: params.state.gameOver,
        };
        const events: Array<{ type: string; data?: any }> = [];
        if (res.possessionChanged) events.push({ type: 'possessionChanged' });
        if (res.touchdown) events.push({ type: 'touchdown' });
        if (res.safety) events.push({ type: 'safety' });
        return { nextState, outcome: res.outcome, events };
      },
    },
  };
}

// Load legacy DOM/UI logic via bridge (replaces <script src="main.js">)
try { await import('./legacy/main-bridge'); } catch {}

