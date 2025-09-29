import type { GameState } from '../domain/GameState';
import type { Outcome, PenaltyInfo } from './ResultParsing';
import { DEFAULT_TIME_KEEPING } from './ResultParsing';

export interface PenaltyContext {
  prePlayState: GameState; // state at snap
  postPlayState: GameState; // state after play, before penalty
  offenseGainedYards: number; // signed yards from snap relative to offense direction (0 if non-yardage)
  outcome: Outcome; // contains penalty info, category, outOfBounds, etc.
  inTwoMinute: boolean; // true if two-minute rules active
  wasFirstDownOnPlay: boolean; // true if play gained/converted independent of penalty
}

export interface AdminResult {
  accepted: GameState;
  declined: GameState;
  decisionHint: 'accept' | 'decline' | 'neutral';
  adminMeta: {
    automaticFirstDownApplied: boolean;
    halfDistanceCapped: boolean;
    measuredFromMidfieldForLG: boolean;
    spotBasis: 'previous' | 'spot-of-foul' | 'midfield';
    untimedDownScheduled: boolean;
  };
}

function clampBallOn(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function yardsTowardsOffense(pre: GameState, yards: number): number {
  return pre.possession === 'player' ? yards : -yards;
}

function applyFromAbsolute(prevAbs: number, yardsTowardsOff: number): number {
  return clampBallOn(prevAbs + yardsTowardsOff);
}

function distanceToOffenseGoal(pre: GameState, ballOnAbs: number): number {
  // Distance from current spot to offense goal line along offense direction
  return pre.possession === 'player' ? (100 - ballOnAbs) : ballOnAbs;
}

function distanceToDefenseGoal(pre: GameState, ballOnAbs: number): number {
  // Distance from current spot to defense goal line (opposite of offense goal)
  return pre.possession === 'player' ? ballOnAbs : (100 - ballOnAbs);
}

function capHalfDistance(amount: number, capDistance: number): { applied: number; capped: boolean } {
  const cap = Math.floor(capDistance / 2);
  if (amount > cap) return { applied: cap, capped: true };
  return { applied: amount, capped: false };
}

function recomputeDownAndDistance(pre: GameState, newBallOn: number, resetFirstDown: boolean): { down: number; toGo: number } {
  if (resetFirstDown) {
    const yardsToGoal = pre.possession === 'player' ? (100 - newBallOn) : newBallOn;
    const toGo = Math.min(10, yardsToGoal);
    return { down: 1, toGo };
  }
  // No reset: repeat down on accepted penalty administered from previous spot
  // (Standard scrimmage penalties replay the down)
  const yardsToGoal = pre.possession === 'player' ? (100 - newBallOn) : newBallOn;
  const lineToGainRemaining = Math.min(10, yardsToGoal); // assume fresh series retained at pre snap
  return { down: Math.max(1, pre.down), toGo: Math.max(1, lineToGainRemaining) };
}

function isLongGain(outcome: Outcome): boolean {
  if (!outcome) return false;
  if (outcome.raw && /\bLG\b/i.test(outcome.raw)) return true;
  return false;
}

function computeTimeOff(inTwoMinute: boolean, untimed: boolean): number {
  if (untimed) return 0;
  // Use penalty time from defaults
  return DEFAULT_TIME_KEEPING.penalty;
}

function makeBase(state: GameState): GameState {
  return { ...state, score: { ...state.score } };
}

function marchPenalty(pre: GameState, basisAbs: number, pen: PenaltyInfo, lgMidfield: boolean): { ballOn: number; capped: boolean; spotBasis: 'previous' | 'midfield' } {
  const measuredFromMidfieldForLG = lgMidfield && pen.on === 'defense';
  const spotBasis: 'previous' | 'midfield' = measuredFromMidfieldForLG ? 'midfield' : 'previous';
  const startAbs = measuredFromMidfieldForLG ? 50 : basisAbs;
  if (pen.on === 'defense') {
    // March towards offense goal line; cap at half distance to offense goal from start
    const distToGoal = distanceToOffenseGoal(pre, startAbs);
    const { applied, capped } = capHalfDistance(pen.yards, distToGoal);
    const newAbs = applyFromAbsolute(startAbs, yardsTowardsOffense(pre, applied));
    return { ballOn: newAbs, capped, spotBasis };
  } else {
    // Against offense: march away from offense goal (towards defense goal) from previous spot
    const distToDefGoal = distanceToDefenseGoal(pre, startAbs);
    const { applied, capped } = capHalfDistance(pen.yards, distToDefGoal);
    const newAbs = applyFromAbsolute(startAbs, yardsTowardsOffense(pre, -applied));
    return { ballOn: newAbs, capped, spotBasis };
  }
}

export function administerPenalty(ctx: PenaltyContext): AdminResult {
  const { prePlayState: pre, postPlayState: post, outcome, inTwoMinute } = ctx;
  const pen = outcome.penalty!;
  const lg = isLongGain(outcome);
  const measuredFromMidfieldForLG = lg && pen.on === 'defense';

  // Declined always keeps post-play state and normal clock off already applied later by caller
  const declined = makeBase(post);

  // Accepted: administered from previous spot by default, special LG from midfield
  const march = marchPenalty(pre, pre.ballOn, pen, measuredFromMidfieldForLG);
  const autoFD = !!pen.firstDown && pen.on === 'defense';
  const dd = recomputeDownAndDistance(pre, march.ballOn, autoFD);

  const acceptedBase: GameState = makeBase(pre);
  let accepted: GameState = { ...acceptedBase, ballOn: march.ballOn, down: dd.down, toGo: dd.toGo };

  // Timekeeping & untimed down rule: defensive penalty at 0:00 in regulation → untimed down
  const isRegulation = pre.quarter <= 4;
  const atZero = pre.clock === 0 || accepted.clock === 0;
  const defensive = pen.on === 'defense';
  const untimedDownScheduled = defensive && isRegulation && atZero;
  const timeOff = computeTimeOff(inTwoMinute, untimedDownScheduled);
  accepted.clock = Math.max(0, pre.clock - timeOff);

  const adminMeta = {
    automaticFirstDownApplied: autoFD,
    halfDistanceCapped: march.capped,
    measuredFromMidfieldForLG,
    spotBasis: march.spotBasis,
    untimedDownScheduled,
  } as const;

  // Decision heuristic
  function valueOf(st: GameState): number {
    // Higher is better for offense: consider yards gained towards offense goal and down/toGo
    const yardsToOffGoal = distanceToOffenseGoal(pre, st.ballOn);
    const yardsAdv = -(yardsToOffGoal) + distanceToOffenseGoal(pre, pre.ballOn);
    const downValue = st.down === 1 ? 5 : (st.down === 2 ? 2 : (st.down === 3 ? 0 : -3));
    const toGoValue = Math.max(0, 10 - st.toGo) * 0.2;
    return yardsAdv + downValue + toGoValue;
  }
  const vAccept = valueOf(accepted);
  const vDecline = valueOf(declined);
  let decisionHint: 'accept' | 'decline' | 'neutral' = 'neutral';
  if (vAccept > vDecline + 0.5) decisionHint = 'accept';
  else if (vDecline > vAccept + 0.5) decisionHint = 'decline';

  return { accepted, declined, decisionHint, adminMeta };
}


