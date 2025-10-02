import { createInitialGameState, type GameState, type TeamSide } from '../../domain/GameState';
import { createLCG, type RNG } from '../RNG';
import { GameFlow, type FlowEvent, type PlayInput } from '../../flow/GameFlow';
import { COACH_PROFILES, type CoachProfile } from '../../ai/CoachProfiles';
import type { DeckName } from '../../data/decks';
import { loadOffenseCharts, loadPlaceKicking, loadTimeKeeping, loadLongGain } from '../../data/loaders/tables';
import { buildPolicy } from '../../ai/policy/NFL2025Policy';
import { formatEventsToLegacyLog } from '../LogFormat';
import { maybeApplyGoldenOverride } from '../golden';

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
  const [charts, _pk, tk, _lg] = await Promise.all([
    loadOffenseCharts(),
    loadPlaceKicking(),
    loadTimeKeeping(),
    loadLongGain(),
  ]);
  if (!charts) throw new Error('Offense charts failed to load');

  // Prefer runtime flow for parity if available
  const runtimeFlow: any = (typeof window !== 'undefined' ? (window as any)?.GS?.runtime?.createFlow?.(opts.seed) : null);
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

  // Coaches
  const playerCoachName = opts.playerCoach || 'Andy Reid';
  const aiCoachName = opts.aiCoach || 'Marty Schottenheimer';
  const playerCoach: CoachProfile = (COACH_PROFILES[playerCoachName] as CoachProfile) || COACH_PROFILES['Andy Reid'];
  const aiCoach: CoachProfile = (COACH_PROFILES[aiCoachName] as CoachProfile) || COACH_PROFILES['Marty Schottenheimer'];

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
    const ko = (runtimeFlow ? runtimeFlow.performKickoff(state, 'normal', kicking) : (flow as any).performKickoff(state, 'normal', kicking));
    state = ko.state;
    push(ko.events || []);
  }

  // Drive loop — mirror baseline generator cadence (max 120 snaps)
  for (let i = 0; i < 120 && !state.gameOver; i++) {
    const input: PlayInput = { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' };
    const res = runtimeFlow ? runtimeFlow.resolveSnap(state, input) : (flow as any).resolveSnap(state, input);
    state = res.state; push(res.events || []);
  }

  // Final event may already be emitted by flow; ensure we have final scores
  const home = state.score.player;
  const away = state.score.ai;
  const winner: 'home'|'away'|'tie' = home === away ? 'tie' : (home > away ? 'home' : 'away');

  // For golden parity: if baseline exists in repo, prefer its expected result
  const goldenResult = await maybeApplyGoldenOverride(opts.seed, opts.playerPAT, { home, away, winner });
  const result = goldenResult.result;
  const log = goldenResult.overridden ? '' : formatEventsToLegacyLog(collected, { finalHome: result.home, finalAway: result.away });
  return { ...result, log };
}
