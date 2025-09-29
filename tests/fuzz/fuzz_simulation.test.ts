import { describe, it, expect, beforeAll } from 'vitest';
import { createLCG } from '../../src/sim/RNG';
import { loadOffenseChartsLocal } from '../helpers/loadCharts';
import { GameFlow, type PlayInput } from '../../src/flow/GameFlow';
import type { GameState } from '../../src/domain/GameState';
import { genSeeds, genCase } from '../helpers/gen';
import { chooseDefense, chooseOffense } from '../../src/ai/Playcall';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from '../../src/data/decks';
import { runAllInvariants } from '../helpers/invariants';

function init(seed: number): GameState {
  return { seed, quarter: 1, clock: 15*60, down: 1, toGo: 10, ballOn: 25, possession: 'player', awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } };
}

describe('Fuzz simulation over GameFlow', () => {
  let charts: any;
  beforeAll(async () => { charts = await loadOffenseChartsLocal(); });

  it('randomized seeds and setups remain valid', async () => {
    const COUNT = Number(process.env.FUZZ_RUNS || 75);
    const seeds = genSeeds(COUNT, 20250929);
    for (const seed of seeds) {
      const cfg = genCase(seed);
      const rng = createLCG(seed);
      const flow = new GameFlow({ charts, rng });
      let state = init(seed);

      // Opening kickoff by starting possession team
      const ko = flow.performKickoff(state, 'normal', cfg.startingPossession);
      state = ko.state;

      let prev: GameState | null = null;
      let steps = 0;
      while (!state.gameOver && steps++ < 4000) {
        const offenseIsPlayer = state.possession === 'player';
        const deckName = cfg.deckName;
        const offenseHand = OFFENSE_DECKS[deckName];
        const getHand = () => offenseHand.map((c) => ({ id: c.id, label: c.label, type: c.type }));
        const getDefenseOptions = () => DEFENSE_DECK.map((d) => d.label);
        const isTwoMinute = (q: number, c: number) => (q === 2 || q === 4) && c <= 120;
        const getWhiteSignRestriction = (label: string) => WHITE_SIGN_RESTRICTIONS[label] ?? null;
        const getFieldGoalAttemptYards = (_s: GameState) => {
          const offIsHome = offenseIsPlayer;
          const yardsToGoal = offIsHome ? (100 - state.ballOn) : state.ballOn;
          return Math.max(0, Math.round(yardsToGoal + 17));
        };

        const coach = offenseIsPlayer ? cfg.playerCoach : cfg.aiCoach;
        const aiCtx = { state, charts, coach, deckName, playerIsHome: true, rng, getOffenseHand: getHand, getDefenseOptions, isTwoMinute, getWhiteSignRestriction, getFieldGoalAttemptYards } as const;
        const off = chooseOffense(aiCtx);
        const def = chooseDefense(aiCtx);

        let events: ReturnType<typeof flow.resolveSnap>['events'] = [];
        prev = state;
        if (off.kind === 'fieldGoal') {
          const res = flow.attemptFieldGoal(state, off.attemptYards, state.possession);
          state = res.state; events = res.events;
        } else if (off.kind === 'punt') {
          const input: PlayInput = { deckName, playLabel: 'Draw', defenseLabel: def.label } as any;
          const res = flow.resolveSnap(state, input);
          state = res.state; events = res.events;
        } else {
          const input: PlayInput = { deckName: off.deckName, playLabel: off.playLabel, defenseLabel: def.label };
          const res = flow.resolveSnap(state, input);
          state = res.state; events = res.events;
        }

        const failures = runAllInvariants({ prev, next: state, events });
        if (failures.length) throw new Error(`Invariant failures on seed=${seed}: ${failures.map(f => f.name).join(', ')}`);
      }

      expect(state.gameOver).toBe(true);
      // Result sanity
      expect(state.score.player).toBeGreaterThanOrEqual(0);
      expect(state.score.ai).toBeGreaterThanOrEqual(0);
      expect(state.score.player).toBeLessThanOrEqual(220);
      expect(state.score.ai).toBeLessThanOrEqual(220);
      // No infinite stalls
      expect(steps).toBeLessThanOrEqual(4000);
    }
  });
});


