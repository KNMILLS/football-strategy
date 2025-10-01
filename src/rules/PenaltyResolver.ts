import type { RNG } from '../sim/RNG';
import type { PenaltyTable } from '../data/schemas/MatchupTable';
import type { PenaltyInfo } from './Penalties';
import { fetchPenaltyTableByName } from '../data/loaders/penaltyTables';

/**
 * Penalty resolution result for dice system integration
 */
export interface PenaltyResolution {
  /** The penalty information */
  penalty: PenaltyInfo;
  /** Whether this is a forced override (no accept/decline choice) */
  isForcedOverride: boolean;
  /** The penalty table entry used */
  tableEntry: PenaltyTable['entries'][keyof PenaltyTable['entries']];
}

/**
 * Resolves a penalty using the d10 penalty table system
 * Used when 2-19 doubles are rolled in the dice system
 */
export async function resolvePenaltyFromTable(
  tableName: string,
  rng: RNG
): Promise<PenaltyResolution> {
  // Fetch the penalty table
  const tableResult = await fetchPenaltyTableByName(tableName);
  if (!tableResult.ok) {
    throw new Error(`Failed to load penalty table '${tableName}': ${tableResult.error}`);
  }

  const table = tableResult.data;

  // Roll d10 (1-10)
  const roll = Math.floor(rng() * 10) + 1;
  const slot = roll.toString() as keyof PenaltyTable['entries'];

  const entry = table.entries[slot];
  if (!entry) {
    throw new Error(`No penalty entry found for slot ${slot} in table ${tableName}`);
  }

  // Convert table entry to PenaltyInfo
  let penalty: PenaltyInfo;
  if (entry.side === 'offset') {
    // For offsetting penalties, randomly choose a side and use smaller yardage
    const side = rng() < 0.5 ? 'offense' : 'defense';
    penalty = {
      on: side,
      yards: 5,
      ...(entry.auto_first_down && { firstDown: true })
    };
  } else {
    penalty = {
      on: entry.side,
      yards: entry.yards || 10, // Default to 10 if no yards specified
      ...(entry.auto_first_down && { firstDown: true })
    };
  }

  // Check if this is a forced override (slots 4, 5, 6)
  const isForcedOverride = entry.override_play_result === true;

  return {
    penalty,
    isForcedOverride,
    tableEntry: entry
  };
}

/**
 * Synchronous version for testing - requires pre-loaded table
 */
export function resolvePenaltyFromTableSync(
  table: PenaltyTable,
  rng: RNG
): PenaltyResolution {
  // Roll d10 (1-10)
  const roll = Math.floor(rng() * 10) + 1;
  const slot = roll.toString() as keyof PenaltyTable['entries'];

  const entry = table.entries[slot];
  if (!entry) {
    throw new Error(`No penalty entry found for slot ${slot}`);
  }

  // Convert table entry to PenaltyInfo
  let penalty: PenaltyInfo;
  if (entry.side === 'offset') {
    // For offsetting penalties, randomly choose a side and use smaller yardage
    const side = rng() < 0.5 ? 'offense' : 'defense';
    penalty = {
      on: side,
      yards: 5,
      ...(entry.auto_first_down && { firstDown: true })
    };
  } else {
    penalty = {
      on: entry.side,
      yards: entry.yards || 10, // Default to 10 if no yards specified
      ...(entry.auto_first_down && { firstDown: true })
    };
  }

  // Check if this is a forced override (slots 4, 5, 6)
  const isForcedOverride = entry.override_play_result === true;

  return {
    penalty,
    isForcedOverride,
    tableEntry: entry
  };
}
