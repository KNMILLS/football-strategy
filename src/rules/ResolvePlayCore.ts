import type { GameState } from '../domain/GameState';
import type { RNG } from '../sim/RNG';
import { determineOutcomeFromCharts } from './Charts';
import type { Outcome } from './ResultParsing';
// import { parseResultString } from './ResultParsing';
import { timeOffWithTwoMinute } from './Timekeeping';
import { administerPenalty } from './PenaltyAdmin';
import { isInEndZone, isThroughEndZone, interceptionTouchback } from './Spots';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';

export interface ResolveInput {
  state: GameState;
  charts: OffenseCharts;
  deckName: string;
  playLabel: string;
  defenseLabel: string;
  rng: RNG;
}

export interface ResolveResult {
  state: GameState;
  outcome: Outcome;
  touchdown: boolean;
  safety: boolean;
  possessionChanged: boolean;
}

export function applyYards(state: GameState, yards: number): GameState {
  const next = { ...state };
  if (state.possession === 'player') next.ballOn = Math.max(0, Math.min(100, state.ballOn + yards));
  else next.ballOn = Math.max(0, Math.min(100, state.ballOn - yards));
  return next;
}

function handleScoring(state: GameState): { state: GameState; touchdown: boolean; safety: boolean } {
  const next = { ...state, score: { ...state.score } };
  let touchdown = false;
  let safety = false;
  if (state.possession === 'player') {
    if (state.ballOn >= 100) { next.score.player += 6; touchdown = true; }
    if (state.ballOn <= 0) { next.score.ai += 2; safety = true; }
  } else {
    if (state.ballOn <= 0) { next.score.ai += 6; touchdown = true; }
    if (state.ballOn >= 100) { next.score.player += 2; safety = true; }
  }
  return { state: next, touchdown, safety };
}

export function resolvePlayCore(input: ResolveInput): ResolveResult {
  let { state } = input;
  const outcome = determineOutcomeFromCharts({
    deckName: input.deckName,
    playLabel: input.playLabel,
    defenseLabel: input.defenseLabel,
    charts: input.charts,
    rng: input.rng,
  });
  // Penalty administration
  if (outcome.category === 'penalty' && outcome.penalty) {
    const pre = state;
    // In penalty path, the post-play equals pre because we short-circuit before applying yards
    const post = state;
    const offenseGainedYards = 0;
    const wasFirstDownOnPlay = false;
    const admin = administerPenalty({
      prePlayState: pre,
      postPlayState: post,
      offenseGainedYards,
      outcome,
      inTwoMinute: false,
      wasFirstDownOnPlay,
    });
    const next = admin.decisionHint === 'decline' ? admin.declined : admin.accepted;
    return { state: next, outcome, touchdown: false, safety: false, possessionChanged: false };
  }
  // Apply yards or category effects
  let next = { ...state };
  let possessionChanged = false;
  if (outcome.category === 'gain' || outcome.category === 'loss') {
    next = applyYards(state, outcome.yards);
  } else if (outcome.category === 'incomplete') {
    // no yard change
  } else if (outcome.category === 'interception') {
    // Flip possession and apply return yards relative to new offense direction
    next.possession = state.possession === 'player' ? 'ai' : 'player';
    possessionChanged = true;
    // Spot at current LOS, then apply return towards new offense goal
    const ret = outcome.interceptReturn || 0;
    if (next.possession === 'player') next.ballOn = Math.max(0, Math.min(100, state.ballOn + ret));
    else next.ballOn = Math.max(0, Math.min(100, state.ballOn - ret));
    // End-zone handling after interception return movement
    if (isThroughEndZone(next.ballOn)) {
      const tb = interceptionTouchback({ ballOn: next.ballOn, possessing: next.possession });
      next.ballOn = tb.ballOn;
    } else if (isInEndZone(next.ballOn)) {
      // By legacy behavior: touchback if downed in end zone; TD only if return legitimately crosses opposite goal in-bounds
      const tb = interceptionTouchback({ ballOn: next.ballOn, possessing: next.possession });
      next.ballOn = tb.ballOn;
    }
    // Reset downs
    next.down = 1; next.toGo = 10;
  } else if (outcome.category === 'fumble') {
    // Simple turnover with no return
    next.possession = state.possession === 'player' ? 'ai' : 'player';
    possessionChanged = true;
    next.down = 1; next.toGo = 10;
  }
  // First down logic only if we didn't already reset downs due to turnover
  if (!possessionChanged && (outcome.category === 'gain' || outcome.category === 'loss')) {
    const gained = Math.abs(outcome.yards);
    const madeLine = gained >= state.toGo && outcome.yards > 0;
    if (madeLine) {
      next.down = 1;
      next.toGo = 10;
    } else {
      next.down = Math.min(4, state.down + 1);
      next.toGo = Math.max(1, madeLine ? 10 : state.toGo - Math.max(0, outcome.yards));
    }
  } else if (!possessionChanged && outcome.category === 'incomplete') {
    next.down = Math.min(4, state.down + 1);
  }
  // Timekeeping
  const wasFirstDown = !possessionChanged && (outcome.category === 'gain' && outcome.yards > 0 && outcome.yards >= state.toGo);
  const timeOff = timeOffWithTwoMinute(outcome, false /* caller should pass real two-minute later */, wasFirstDown);
  next.clock = Math.max(0, state.clock - timeOff);
  // Scoring check
  const scoreRes = handleScoring(next);
  next = scoreRes.state;
  return { state: next, outcome, touchdown: scoreRes.touchdown, safety: scoreRes.safety, possessionChanged };
}
