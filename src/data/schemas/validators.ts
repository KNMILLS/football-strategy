import type { MatchupTable, PenaltyTable } from './MatchupTable';

/**
 * Runtime validation functions for loaded table data
 * These complement the Zod schemas with additional business logic validation
 */

/**
 * Validates that a matchup table meets all GDD requirements
 */
export function validateMatchupTable(table: MatchupTable): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check turnover band requirement (3-5 must exist)
  const turnoverBandSums = ['3', '4', '5'];
  for (const sum of turnoverBandSums) {
    if (!(sum in table.entries)) {
      errors.push(`Missing required entry for sum ${sum} (turnover band requirement)`);
    }
  }

  // Check field position constraints
  for (const [sum, outcome] of Object.entries(table.entries)) {
    const sumNum = parseInt(sum);

    // Turnover validation
    if (outcome.turnover) {
      if (outcome.turnover.return_yards !== undefined && outcome.turnover.return_yards < 0) {
        errors.push(`Invalid negative return yards for sum ${sum}`);
      }
      if (outcome.turnover.return_to && outcome.turnover.return_to !== 'LOS') {
        errors.push(`Invalid return_to value for sum ${sum}: only 'LOS' is supported`);
      }
    }

    // Explosive plays should have appropriate yardage
    if (sumNum >= table.meta.explosive_start_sum && outcome.yards < 20) {
      errors.push(`Sum ${sum} marked as explosive but has insufficient yards (${outcome.yards})`);
    }
  }

  // Validate doubles configuration
  if (!table.doubles['1'] || !table.doubles['20'] || !table.doubles['2-19']) {
    errors.push('Missing required doubles entries (1, 20, 2-19)');
  }

  if (!table.doubles['2-19'].penalty_table_ref) {
    errors.push('Missing penalty table reference for doubles 2-19');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a penalty table meets all GDD requirements
 */
export function validatePenaltyTable(table: PenaltyTable): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that all 10 slots exist
  for (let i = 1; i <= 10; i++) {
    const slot = i.toString();
    if (!table.entries[slot as keyof typeof table.entries]) {
      errors.push(`Missing penalty entry for slot ${slot}`);
    }
  }

  // Validate forced overrides (slots 4, 5, 6 must override play result)
  const forcedOverrideSlots = ['4', '5', '6'];
  for (const slot of forcedOverrideSlots) {
    const entry = table.entries[slot as keyof typeof table.entries];
    if (!entry?.override_play_result) {
      errors.push(`Slot ${slot} must have override_play_result: true (forced override requirement)`);
    }
  }

  // Validate penalty yardage is reasonable
  for (let i = 1; i <= 10; i++) {
    const slot = i.toString();
    const entry = table.entries[slot as keyof typeof table.entries];
    if (entry?.yards !== undefined && Math.abs(entry.yards) > 50) {
      errors.push(`Unusual penalty yardage (${entry.yards}) for slot ${slot}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that loaded table data can be used safely in the game engine
 */
export function validateTableForEngine(table: MatchupTable | PenaltyTable): { valid: boolean; errors: string[] } {
  if ('off_card' in table) {
    // It's a matchup table
    return validateMatchupTable(table);
  } else {
    // It's a penalty table
    return validatePenaltyTable(table as PenaltyTable);
  }
}
