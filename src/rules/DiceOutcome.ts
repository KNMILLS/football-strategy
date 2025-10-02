import type { PenaltyTable } from '../data/schemas/MatchupTable';
import type { RNG } from '../sim/RNG';

/**
 * Core dice roll result
 */
export interface DiceRoll {
  d1: number;
  d2: number;
  sum: number;
  isDoubles: boolean;
}

/**
 * Turnover information
 */
export interface TurnoverInfo {
  type: 'INT' | 'FUM';
  return_yards?: number | undefined;
  return_to?: 'LOS' | undefined;
}

/**
 * Base outcome from normal dice resolution (sums 3-39)
 */
export interface BaseOutcome {
  yards?: number;
  turnover?: TurnoverInfo;
  oob?: boolean;
  clock?: 10 | 20 | 30;
  tags?: string[];
}

/**
 * Penalty outcome information
 */
export interface PenaltyOutcome {
  roll: number; // d10 roll result (1-10)
  penaltyInfo: PenaltyTable['entries'][keyof PenaltyTable['entries']];
  // Whether this penalty overrides the play result (forced override)
  overridesPlayResult: boolean;
}

/**
 * Doubles outcome types
 */
export type DoublesKind = 'DEF_TD' | 'OFF_TD' | 'PENALTY';

/**
 * Complete resolution result from dice system
 */
export interface DiceResolutionResult {
  // The dice roll that generated this result
  diceRoll: DiceRoll;

  // Base outcome (before penalty consideration) - only present for normal rolls
  baseOutcome?: BaseOutcome;

  // Penalty information (present for doubles 2-19)
  penalty?: PenaltyOutcome;

  // Doubles result type
  doubles?: DoublesKind;

  // Whether penalty can be accepted/declined (only for non-forced penalties)
  canAcceptDecline?: boolean;

  // Final computed yards after all mechanics (field clamping, penalties, etc.)
  finalYards?: number | undefined;

  // Final clock runoff in seconds (10, 20, or 30)
  finalClockRunoff: 10 | 20 | 30;

  // Human-readable description of the result
  description: string;

  // Tags for UI and commentary
  tags: string[];
}

/**
 * Helper function to create a dice roll
 */
export function createDiceRoll(d1: number, d2: number): DiceRoll {
  return {
    d1,
    d2,
    sum: d1 + d2,
    isDoubles: d1 === d2
  };
}

/**
 * Helper function to determine if a penalty roll is a forced override (4, 5, or 6)
 */
export function isForcedOverride(penaltyRoll: number): boolean {
  return penaltyRoll >= 4 && penaltyRoll <= 6;
}

/**
 * Helper function to determine if penalty can be accepted/declined
 */
export function canAcceptDeclinePenalty(penaltyRoll: number): boolean {
  return penaltyRoll >= 2 && penaltyRoll <= 19 && !isForcedOverride(penaltyRoll);
}

/**
 * Clock runoff determination based on play characteristics
 * OOB/incompletions = 10", chain-movers = 20", normal runs = 30"
 */
export function determineClockRunoff(
  oob?: boolean,
  isFirstDown?: boolean,
  isIncomplete?: boolean
): 10 | 20 | 30 {
  if (oob || isIncomplete) {
    return 10;
  } else if (isFirstDown) {
    return 20;
  } else {
    return 30;
  }
}

/**
 * Roll a d20 using the new LCG-derived RNG value r in [0,1): face = floor(r * 20) + 1
 */
export function rollD20(rng: RNG): number {
  const r = rng();
  return Math.floor(r * 20) + 1;
}

/**
 * Roll a d10 using the new LCG-derived RNG value r in [0,1): face = floor(r * 10) + 1
 */
export function rollD10(rng: RNG): number {
  const r = rng();
  return Math.floor(r * 10) + 1;
}
