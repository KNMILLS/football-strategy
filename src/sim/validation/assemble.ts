import { createInitialGameState, type GameState, type TeamSide } from '../../domain/GameState';
import { createLCG, type RNG } from '../RNG';
import { GameFlow, type FlowEvent, type PlayInput } from '../../flow/GameFlow';
import { loadOffenseCharts, loadTimeKeeping } from '../../data/loaders/tables';
import { buildPolicy } from '../../ai/policy/NFL2025Policy';
import { simulateOneGame } from '../run/single';

export interface BatchValidationOptions {
  seeds: number[];
  playerPAT: 'kick'|'two'|'auto';
}

export interface BatchValidationResultEntry {
  seed: number;
  home: number;
  away: number;
  winner: 'home'|'away'|'tie';
  log: string;
  validation: { ok: boolean; issues: string[]; stats: { hudCount: number; logCount: number; scoreEvents: number; kickoffEvents: number } };
}

export interface BatchValidationSummary {
  total: number;
  passed: number;
  failed: number;
  failures: Array<{ seed: number; issues: string[] }>;
  avgHome: number;
  avgAway: number;
}

export async function simulateAndValidateBatch(opts: BatchValidationOptions): Promise<{ entries: BatchValidationResultEntry[]; summary: BatchValidationSummary }> {
  const entries: BatchValidationResultEntry[] = [];
  let sumHome = 0; let sumAway = 0;
  for (const seed of opts.seeds) {
    // Run one game capturing events by replaying using the same path as simulateOneGame
    // We re-run here to keep simulateOneGame API stable while still validating deeply via events
    const one = await simulateOneGame({ seed, playerPAT: opts.playerPAT });
    sumHome += one.home; sumAway += one.away;
    // Minimal event-derived validation via log-independent rules: we reconstruct from scoring lines not possible due to FG omission,
    // so we rely on simulateOneGame's internal collection by re-simulating quickly with event capture for validation.
    const detailed = await (async () => {
      const rng: RNG = createLCG(seed);
      const charts = await loadOffenseCharts();
      if (!charts) throw new Error('Offense charts failed to load');
      const tk = await loadTimeKeeping();
      const runtimeFlow: any = (typeof window !== 'undefined' ? (window as any)?.GS?.runtime?.createFlow?.(seed) : null);
      const policy = buildPolicy();
      const flow = runtimeFlow || new GameFlow({ charts, rng, timeKeeping: tk || {
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
      }, policy: {
        choosePAT: ({ diff, quarter, clock, side }) => {
          if (side === 'player') {
            if (opts.playerPAT === 'two') return 'two';
            if (opts.playerPAT === 'auto') {
              const aiLeadsBy = -(diff);
              return (aiLeadsBy === 1 || aiLeadsBy === 2) ? 'two' : 'kick';
            }
            return 'kick';
          }
          return policy.choosePAT({ quarter, time_remaining_sec: clock, score_diff: diff });
        },
      }});
      let state: GameState = createInitialGameState(seed);
      state.possession = 'player';
      const events: FlowEvent[] = [];
      const push = (evs: FlowEvent[]) => { events.push(...evs); };
      const kicking: TeamSide = state.possession === 'player' ? 'ai' : 'player';
      const ko = (runtimeFlow ? runtimeFlow.performKickoff(state, 'normal', kicking) : (flow as any).performKickoff(state, 'normal', kicking));
      state = ko.state; push(ko.events || []);
      for (let i = 0; i < 120 && !state.gameOver; i++) {
        const input: PlayInput = { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' };
        const res = runtimeFlow ? runtimeFlow.resolveSnap(state, input) : (flow as any).resolveSnap(state, input);
        state = res.state; push(res.events || []);
      }
      return { state, events };
    })();
    const { validateEvents } = await import('../Validation');
    const report = validateEvents(detailed.events);
    entries.push({ seed, home: one.home, away: one.away, winner: one.winner, log: one.log, validation: report });
  }
  const passed = entries.filter(e => e.validation.ok).length;
  const failed = entries.length - passed;
  const failures = entries.filter(e => !e.validation.ok).map(e => ({ seed: e.seed, issues: e.validation.issues }));
  const summary: BatchValidationSummary = {
    total: entries.length,
    passed,
    failed,
    failures,
    avgHome: entries.length ? +(sumHome / entries.length).toFixed(2) : 0,
    avgAway: entries.length ? +(sumAway / entries.length).toFixed(2) : 0,
  };
  return { entries, summary };
}
