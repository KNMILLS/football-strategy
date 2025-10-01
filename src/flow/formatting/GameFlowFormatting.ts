import type { TeamSide } from '../../domain/GameState';

/**
 * Formatting utilities for game flow operations
 * Contains functions for formatting game state information for display
 */

/**
 * Formats a down number as an ordinal string
 * @param n - Down number (1-4, or higher for overtime)
 * @returns Formatted ordinal string (e.g., "1st", "2nd", "3rd", "4th")
 */
export function formatOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${Math.max(1, Math.min(4, n))}th`;
}

/**
 * Formats clock time in seconds to MM:SS format
 * @param totalSeconds - Time in seconds
 * @returns Formatted time string (e.g., "15:00", "3:45")
 */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.floor(Math.max(0, totalSeconds) % 60);
  const ss = s < 10 ? `0${s}` : String(s);
  return `${m}:${ss}`;
}

/**
 * Formats a score and anchor line for broadcast commentary
 * @param s - Current game state
 * @returns Formatted anchor line string
 */
export function scoreAnchorLine(s: { score: { player: number; ai: number }; quarter: number; clock: number }): string {
  return `Anchor — HOME ${s.score.player} — AWAY ${s.score.ai} — Q${s.quarter} ${formatClock(s.clock)}`;
}

/**
 * Formats possession spot for broadcast commentary
 * @param possessing - Team with possession
 * @param ballOn - Ball position (0-100)
 * @returns Formatted possession spot string
 */
export function formatPossessionSpotForBroadcast(possessing: TeamSide, ballOn: number): string {
  const own = (possessing === 'player') ? (ballOn <= 50) : (ballOn >= 50);
  const yards = (possessing === 'player') ? (ballOn <= 50 ? Math.max(1, ballOn) : Math.max(1, 100 - ballOn)) : (ballOn >= 50 ? Math.max(1, 100 - ballOn) : Math.max(1, ballOn));
  return own ? `their own ${yards}` : `the ${yards}`;
}

/**
 * Formats team and yard line for display
 * @param possessing - Team with possession
 * @param ballOn - Ball position (0-100)
 * @returns Formatted yard line string (e.g., "HOME 25", "AWAY 35")
 */
export function formatTeamYardLine(possessing: TeamSide, ballOn: number): string {
  const clamp = (n: number) => Math.max(1, Math.min(50, n));
  if (possessing === 'player') {
    if (ballOn <= 50) return `HOME ${clamp(ballOn)}`;
    return `AWAY ${clamp(100 - ballOn)}`;
  } else {
    if (ballOn >= 50) return `AWAY ${clamp(100 - ballOn)}`;
    return `HOME ${clamp(ballOn)}`;
  }
}
