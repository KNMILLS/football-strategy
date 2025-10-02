import type { TeamSide } from '../../domain/GameState';
import type { RNG } from '../../sim/RNG';
import { rollD6 as rollD6PK, PLACE_KICK_TABLE } from '../../rules/special/PlaceKicking';

/**
 * Utility functions for game flow operations
 * Contains helper functions for game state calculations, formatting, and game logic
 */

/**
 * Determines if the game is in two-minute warning territory
 * @param quarter - Current quarter (1-4)
 * @param clock - Current clock time in seconds
 * @returns True if in two-minute warning period
 */
export function isTwoMinute(quarter: number, clock: number): boolean {
  return (quarter === 2 || quarter === 4) && clock <= 120;
}

/**
 * Clamps a yard line position to valid field range (0-100)
 * @param abs - Absolute yard position
 * @returns Clamped yard position
 */
export function clampYard(abs: number): number {
  return Math.max(0, Math.min(100, abs));
}

/**
 * Returns the standard down and distance after a kickoff
 * @returns Down and distance object
 */
export function nextDownDistanceAfterKickoff(): Pick<import('../../domain/GameState').GameState, 'down'|'toGo'> {
  return { down: 1, toGo: 10 } as const;
}

/**
 * Converts a scoring side and points to score deltas for both teams
 * @param side - Team that scored
 * @param points - Points scored
 * @returns Score deltas for both teams
 */
export function scoringSideToDelta(side: TeamSide, points: number): { playerDelta: number; aiDelta: number } {
  return side === 'player' ? { playerDelta: points, aiDelta: 0 } : { playerDelta: 0, aiDelta: points };
}

/**
 * Attempts a PAT (Point After Touchdown) using place kicking rules
 * @param rng - Random number generator
 * @returns True if PAT is successful
 */
export function attemptPatInternal(rng: RNG): boolean {
  // 2D6 using place kicking table's PAT column
  const roll = rollD6PK(rng) + rollD6PK(rng);
  const row = PLACE_KICK_TABLE[roll] || {} as any;
  return row.PAT === 'G';
}

/**
 * Generates a random hash mark position for kickoffs or field goals
 * @param rng - Random number generator (optional, uses Math.random if not provided)
 * @returns Hash mark position string
 */
export function randomHash(rng: RNG): 'left hash'|'right hash'|'middle' {
  const r = rng();
  if (r < 0.45) return 'left hash';
  if (r < 0.9) return 'right hash';
  return 'middle';
}

/**
 * Determines if a team is leading based on current score
 * @param side - Team side to check
 * @param score - Current game score
 * @returns True if the specified team is leading
 */
export function isLeading(side: TeamSide, score: { player: number; ai: number }): boolean {
  const diff = score.player - score.ai;
  return (side === 'player' ? diff : -diff) > 0;
}

/**
 * Determines if a team is trailing based on current score
 * @param side - Team side to check
 * @param score - Current game score
 * @returns True if the specified team is trailing
 */
export function isTrailing(side: TeamSide, score: { player: number; ai: number }): boolean {
  const diff = score.player - score.ai;
  return (side === 'player' ? diff : -diff) < 0;
}

/**
 * Determines if the game is tied
 * @param score - Current game score
 * @returns True if teams are tied
 */
export function isTied(score: { player: number; ai: number }): boolean {
  return score.player === score.ai;
}

/**
 * Default AI logic for determining if team should go for two-point conversion
 * @param ctx - Game context including score differential, quarter, and clock
 * @returns True if AI should attempt two-point conversion
 */
export function defaultAIShouldGoForTwo(ctx: { diff: number; quarter: number; clock: number }): boolean {
  const late = ctx.quarter === 4 && ctx.clock <= 5 * 60;
  // Trailing by 1 or 2 late
  if (ctx.diff < 0 && -ctx.diff <= 2 && late) return true;
  return false;
}
