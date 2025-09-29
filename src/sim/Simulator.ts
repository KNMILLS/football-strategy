import { createInitialGameState, type GameState, type TeamSide } from '../domain/GameState';
import { createLCG, type RNG } from './RNG';
import { GameFlow, type FlowEvent, type PlayInput } from '../flow/GameFlow';
import { COACH_PROFILES, type CoachProfile } from '../ai/CoachProfiles';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS, type DeckName } from '../data/decks';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';
import { loadOffenseCharts, loadPlaceKicking, loadTimeKeeping, loadLongGain } from '../data/loaders/tables';
import { attemptPAT as pkAttemptPAT } from '../rules/special/PlaceKicking';
import { formatEventsToLegacyLog } from './LogFormat';

export interface SimulateOneGameOptions {
  seed: number;
  playerPAT: 'kick'|'two'|'auto';
  playerCoach?: string;
  aiCoach?: string;
  startingPossession?: 'player'|'ai';
}

export interface SimResult { home: number; away: number; winner: 'home'|'away'|'tie'; log: string }

export async function simulateOneGame(opts: SimulateOneGameOptions): Promise<SimResult> {
  const rng: RNG = createLCG(opts.seed);

  // Load tables; tolerate undefined and rely on defaults embedded in rules when possible
  const [charts, _pk, _tk, _lg] = await Promise.all([
    loadOffenseCharts(),
    loadPlaceKicking(),
    loadTimeKeeping(),
    loadLongGain(),
  ]);
  if (!charts) throw new Error('Offense charts failed to load');

  const flow = new GameFlow({ charts, rng, policy: {
    choosePAT: ({ diff, quarter, clock, side }) => {
      if (side === 'player') {
        if (opts.playerPAT === 'two') return 'two';
        if (opts.playerPAT === 'auto') {
          const aiLeadsBy = -(diff); // diff is player-ai
          return (aiLeadsBy === 1 || aiLeadsBy === 2) ? 'two' : 'kick';
        }
        return 'kick';
      }
      // AI heuristic
      const late = quarter === 4 && clock <= 5*60;
      if (late && diff < 0 && -diff <= 2) return 'two';
      return 'kick';
    },
  }});

  // Coaches
  const playerCoachName = opts.playerCoach || 'John Madden';
  const aiCoachName = opts.aiCoach || 'Bill Belichick';
  const playerCoach: CoachProfile = COACH_PROFILES[playerCoachName] || COACH_PROFILES['John Madden'];
  const aiCoach: CoachProfile = COACH_PROFILES[aiCoachName] || COACH_PROFILES['Bill Belichick'];

  // Decks: defaults per requirement
  const homeDeck: DeckName = 'Pro Style';
  const awayDeck: DeckName = 'Ball Control';

  let state: GameState = createInitialGameState(opts.seed);
  state.possession = opts.startingPossession || 'player';

  const collected: FlowEvent[] = [];
  const push = (events: FlowEvent[]) => { collected.push(...events); };

  // Kickoff at start of game: receiving is current possession, so kicker is the other side
  {
    const kicking: TeamSide = state.possession === 'player' ? 'ai' : 'player';
    const ko = flow.performKickoff(state, 'normal', kicking);
    state = ko.state;
    push(ko.events);
  }

  // Drive loop
  let snaps = 0;
  const maxSnaps = 2000; // guard
  while (!state.gameOver && snaps < maxSnaps) {
    snaps++;
    // Fixed play selection for parity with current golden baselines
    const input: PlayInput = { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' };
    const res = flow.resolveSnap(state, input);
    state = res.state; push(res.events);
  }

  // Final event may already be emitted by flow; ensure we have final scores
  const home = state.score.player;
  const away = state.score.ai;
  const winner: 'home'|'away'|'tie' = home === away ? 'tie' : (home > away ? 'home' : 'away');
  const log = formatEventsToLegacyLog(collected, { finalHome: home, finalAway: away });
  return { home, away, winner, log };
}

export async function simulateAutoGames(opts: { seeds: number[]; playerPAT: 'kick'|'two'|'auto' }): Promise<Array<{ seed: number; result: { home: number; away: number; winner: string } }>> {
  const out: Array<{ seed: number; result: { home: number; away: number; winner: string } }> = [];
  for (const seed of opts.seeds) {
    const res = await simulateOneGame({ seed, playerPAT: opts.playerPAT });
    out.push({ seed, result: { home: res.home, away: res.away, winner: res.winner } });
  }
  return out;
}


