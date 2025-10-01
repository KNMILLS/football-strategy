import { describe, it, expect, beforeAll } from 'vitest';
import { createLCG } from '../../src/sim/RNG';
import { loadOffenseChartsLocal } from '../helpers/loadCharts';
import { GameFlow, type PlayInput } from '../../src/flow/GameFlow';
import type { GameState } from '../../src/domain/GameState';
import { chooseDefense, chooseOffense } from '../../src/ai/Playcall';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from '../../src/data/decks';
import { COACH_PROFILES, type CoachProfile } from '../../src/ai/CoachProfiles';

function init(seed: number): GameState {
  return { seed, quarter: 1, clock: 15*60, down: 1, toGo: 10, ballOn: 25, possession: 'player', awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } } as GameState;
}

async function simulateGame(seed: number, charts: any, playerCoach: CoachProfile, aiCoach: CoachProfile, deckName: 'Pro Style'|'Ball Control'|'Aerial Style' = 'Pro Style'): Promise<'home'|'away'|'tie'> {
  const rng = createLCG(seed);
  const flow = new GameFlow({ charts, rng });
  let state = init(seed);

  // Opening kickoff by starting possession team ('player' receives)
  {
    const ko = flow.performKickoff(state, 'normal', 'ai');
    state = ko.state;
  }

  let steps = 0;
  while (!state.gameOver && steps++ < 4000) {
    const offenseIsPlayer = state.possession === 'player';
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

    const coach = offenseIsPlayer ? playerCoach : aiCoach;
    const aiCtx = { state, charts, coach, deckName, playerIsHome: true, rng, getOffenseHand: getHand, getDefenseOptions, isTwoMinute, getWhiteSignRestriction, getFieldGoalAttemptYards } as const;
    const off = chooseOffense(aiCtx);
    const def = chooseDefense(aiCtx);

    if (off.kind === 'fieldGoal') {
      const res = flow.attemptFieldGoal(state, off.attemptYards, state.possession);
      state = res.state;
    } else if (off.kind === 'punt') {
      const input: PlayInput = { deckName, playLabel: 'Draw', defenseLabel: def.label } as any;
      const res = flow.resolveSnap(state, input);
      state = res.state;
    } else {
      const input: PlayInput = { deckName: off.deckName, playLabel: off.playLabel, defenseLabel: def.label };
      const res = flow.resolveSnap(state, input);
      state = res.state;
    }
  }

  const home = state.score.player;
  const away = state.score.ai;
  return home === away ? 'tie' : (home > away ? 'home' : 'away');
}

describe('Coach Monte Carlo', () => {
  let charts: any;
  beforeAll(async () => { charts = await loadOffenseChartsLocal(); });

  it('runs multi-game matchup stats', async () => {
    const GAMES = Number(process.env.MONTE_CARLO_GAMES || 300);
    const coachNames = Object.keys(COACH_PROFILES);
    type Tally = { homeWins: number; awayWins: number; ties: number };
    const pairTallies: Record<string, Tally> = {};
    const overall: Record<string, { wins: number; losses: number; ties: number; games: number }> = {};

    function upsert(name: string) {
      if (!overall[name]) overall[name] = { wins: 0, losses: 0, ties: 0, games: 0 };
      return overall[name];
    }

    for (const homeName of coachNames) {
      for (const awayName of coachNames) {
        if (homeName === awayName) continue;
        const key = `${homeName}__VS__${awayName}`;
        pairTallies[key] = { homeWins: 0, awayWins: 0, ties: 0 };
        for (let i = 0; i < GAMES; i++) {
          const seed = 1000 + i;
          const winner = await simulateGame(seed, charts, COACH_PROFILES[homeName], COACH_PROFILES[awayName], 'Pro Style');
          if (winner === 'home') { pairTallies[key].homeWins++; upsert(homeName).wins++; upsert(awayName).losses++; }
          else if (winner === 'away') { pairTallies[key].awayWins++; upsert(awayName).wins++; upsert(homeName).losses++; }
          else { pairTallies[key].ties++; upsert(homeName).ties++; upsert(awayName).ties++; }
          upsert(homeName).games++; upsert(awayName).games++;
        }
      }
    }

    // Output summary
    console.log('Coach overall win rates (aggregated):');
    const sorted = Object.entries(overall).map(([name, s]) => ({ name, ...s, winPct: s.games ? s.wins / s.games : 0 })).sort((a, b) => b.winPct - a.winPct);
    for (const c of sorted) {
      console.log(`${c.name.padEnd(16)}  win% ${(c.winPct*100).toFixed(1)}  W${c.wins} L${c.losses} T${c.ties}  G${c.games}`);
    }

    console.log('\nHead-to-head (home vs away):');
    for (const [key, t] of Object.entries(pairTallies)) {
      const [homeName, awayName] = key.split('__VS__');
      const total = t.homeWins + t.awayWins + t.ties;
      const homePct = total ? (t.homeWins / total) : 0;
      console.log(`${homeName} vs ${awayName}  home% ${(homePct*100).toFixed(1)}  (${t.homeWins}-${t.awayWins}-${t.ties})`);
    }

    expect(true).toBe(true); // keep test green; results are printed above
  }, 120_000);
});


