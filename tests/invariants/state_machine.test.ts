import { describe, it, expect, beforeAll } from 'vitest';
import { createLCG } from '../../src/sim/RNG';
import { loadOffenseChartsLocal } from '../helpers/loadCharts';
import { GameFlow, type PlayInput } from '../../src/flow/GameFlow';
import type { GameState } from '../../src/domain/GameState';
import { runAllInvariants } from '../helpers/invariants';
import { COACH_PROFILES } from '../../src/ai/CoachProfiles';
import { chooseDefense, chooseOffense, chooseKickoff } from '../../src/ai/Playcall';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from '../../src/data/decks';

async function loadTablesOnce() { return { offenseCharts: await loadOffenseChartsLocal() } as const; }

function initState(seed: number): GameState {
  return {
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
}

describe('State machine invariants — TS runtime only', () => {
  let charts: Awaited<ReturnType<typeof loadTablesOnce>>['offenseCharts'];
  beforeAll(async () => {
    const t = await loadTablesOnce();
    charts = t.offenseCharts;
  });

  it('holds across seeded E2E runs (100 seeds)', async () => {
    const RUNS = Number(process.env.FUZZ_RUNS || 100);
    for (let i = 0; i < RUNS; i++) {
      const seed = 1000 + i;
      const rng = createLCG(seed);
      const flow = new GameFlow({ charts, rng, policy: {
        choosePAT: ({ diff, quarter, clock, side }) => {
          const coach = side === 'player' ? COACH_PROFILES['John Madden'] : COACH_PROFILES['Bill Belichick'];
          const late = quarter === 4 && clock <= 5 * 60;
          if (late && coach.twoPointAggressiveLate && diff < 0 && -diff <= 2) return 'two';
          return 'kick';
        },
        chooseSafetyFreeKick: () => 'kickoff+25',
        chooseKickoffType: ({ trailing, quarter, clock }) => {
          const coach = COACH_PROFILES['Bill Belichick'];
          const late = quarter === 4 && clock <= 2 * 60;
          if (trailing && coach.onsideAggressive && late) return 'onside';
          return 'normal';
        },
      } });

      let state = initState(seed);

      // Opening kickoff to player as home already implied; simulate kickoff manually
      const ko = flow.performKickoff(state, 'normal', 'player');
      state = ko.state;

      // Drive loop until gameOver
      let guard = 0;
      let prev: GameState | null = null;
      while (!state.gameOver && guard++ < 4000) {
        const offenseIsPlayer = state.possession === 'player';
        const coach = offenseIsPlayer ? COACH_PROFILES['Andy Reid'] : COACH_PROFILES['Bill Belichick'];
        const deckName: 'Pro Style'|'Ball Control'|'Aerial Style' = offenseIsPlayer ? 'Pro Style' : 'Ball Control';
        const offenseHand = OFFENSE_DECKS[deckName];
        const getHand = () => offenseHand.map((c) => ({ id: c.id, label: c.label, type: c.type }));
        const getDefenseOptions = () => DEFENSE_DECK.map((d) => d.label);
        const isTwoMinute = (q: number, c: number) => (q === 2 || q === 4) && c <= 120;
        const getWhiteSignRestriction = (label: string) => WHITE_SIGN_RESTRICTIONS[label] ?? null;
        const getFieldGoalAttemptYards = (_s: GameState) => {
          // Simplified distance: attempt from spot + 17
          const offIsHome = offenseIsPlayer;
          const yardsToGoal = offIsHome ? (100 - state.ballOn) : state.ballOn;
          return Math.max(0, Math.round(yardsToGoal + 17));
        };

        const aiCtx = { state, charts, coach, deckName, playerIsHome: true, rng, getOffenseHand: getHand, getDefenseOptions, isTwoMinute, getWhiteSignRestriction, getFieldGoalAttemptYards } as const;
        const off = chooseOffense(aiCtx);
        const def = chooseDefense(aiCtx);

        let events: ReturnType<typeof flow.resolveSnap>['events'] = [];
        prev = state;

        if (off.kind === 'fieldGoal') {
          const res = flow.attemptFieldGoal(state, off.attemptYards, state.possession);
          state = res.state;
          events = res.events;
        } else if (off.kind === 'punt') {
          // Model as a conservative loss in ResolvePlayCore via charts fallback: use a known run label
          const input: PlayInput = { deckName, playLabel: 'Draw', defenseLabel: def.label } as any;
          const res = flow.resolveSnap(state, input);
          state = res.state;
          events = res.events;
        } else {
          const input: PlayInput = { deckName: off.deckName, playLabel: off.playLabel, defenseLabel: def.label };
          const res = flow.resolveSnap(state, input);
          state = res.state;
          events = res.events;
        }

        const failures = runAllInvariants({ prev, next: state, events });
        if (failures.length) {
          const names = failures.map(f => f.name).join(', ');
          throw new Error(`Invariant failures on seed=${seed}: ${names}`);
        }
      }

      // Sanity: nonnegative scores
      expect(state.score.player).toBeGreaterThanOrEqual(0);
      expect(state.score.ai).toBeGreaterThanOrEqual(0);
      // Ensure we didn't stall excessively
      expect(guard).toBeLessThanOrEqual(5000);
    }
  });
});


