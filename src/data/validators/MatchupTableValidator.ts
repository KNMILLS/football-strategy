import { z } from 'zod';
import type { MatchupTable, PenaltyTable } from '../schemas/MatchupTable';

/**
 * Field position clamp helper for validation
 * Ensures yards don't exceed remaining field; handles goal line and safety cases
 */
function clampFieldPosition(yards: number, currentPosition: number): number {
  const fieldLength = 100; // 0-100 yard field

  if (currentPosition + yards > fieldLength) {
    // Would go beyond end zone - safety or touchdown depending on direction
    if (yards > 0) {
      return fieldLength - currentPosition; // Touchdown
    } else {
      return -currentPosition; // Safety (ball goes to 0)
    }
  }

  if (currentPosition + yards < 0) {
    return -currentPosition; // Safety (ball goes to 0)
  }

  return yards;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that a 2d20 matchup table has all required entries for sums 3-39
 * with no gaps and correct structure
 */
export function validateMatchupTable(table: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // First validate the basic schema
    const parsedTable = z.object({
      version: z.string(),
      off_card: z.string(),
      def_card: z.string(),
      dice: z.literal('2d20'),
      entries: z.record(z.string(), z.any()),
      doubles: z.object({
        '1': z.any(),
        '20': z.any(),
        '2-19': z.object({ penalty_table_ref: z.string() }),
      }),
      meta: z.object({
        oob_bias: z.boolean(),
        field_pos_clamp: z.boolean(),
        risk_profile: z.enum(['low', 'medium', 'high']),
        explosive_start_sum: z.number().int().min(20).max(39),
      }),
    }).parse(table);

    // Check that all dice sums 3-39 are present
    const requiredSums = Array.from({ length: 37 }, (_, i) => (i + 3).toString());
    const presentSums = Object.keys(parsedTable.entries);

    const missingSums = requiredSums.filter(sum => !presentSums.includes(sum));
    if (missingSums.length > 0) {
      errors.push(`Missing dice sum entries: ${missingSums.join(', ')}`);
    }

    const extraSums = presentSums.filter(sum => !requiredSums.includes(sum));
    if (extraSums.length > 0) {
      errors.push(`Unexpected dice sum entries: ${extraSums.join(', ')}`);
    }

    // Validate each entry has required fields
    for (const [sum, entry] of Object.entries(parsedTable.entries)) {
      if (typeof entry !== 'object' || entry === null) {
        errors.push(`Dice sum ${sum} must be an object`);
        continue;
      }

      const entryObj = entry as Record<string, unknown>;

      // Check required fields
      if (typeof entryObj.yards !== 'number') {
        errors.push(`Dice sum ${sum} must have numeric yards`);
      }

      if (typeof entryObj.clock !== 'string') {
        errors.push(`Dice sum ${sum} must have string clock`);
      } else {
        // Validate clock values
        if (!['10', '20', '30'].includes(entryObj.clock)) {
          errors.push(`Dice sum ${sum} has invalid clock value: ${entryObj.clock} (must be '10', '20', or '30')`);
        }
      }

      // Validate turnover structure if present
      if (entryObj.turnover) {
        if (typeof entryObj.turnover !== 'object' || entryObj.turnover === null) {
          errors.push(`Dice sum ${sum} turnover must be an object`);
        } else {
          const turnover = entryObj.turnover as Record<string, unknown>;
          if (!['INT', 'FUM'].includes(turnover.type as string)) {
            errors.push(`Dice sum ${sum} turnover type must be 'INT' or 'FUM'`);
          }
          if (turnover.return_yards !== undefined && typeof turnover.return_yards !== 'number') {
            errors.push(`Dice sum ${sum} turnover return_yards must be numeric`);
          }
      if (turnover.return_to !== undefined && !['LOS'].includes(turnover.return_to as string)) {
        errors.push(`Dice sum ${sum} turnover return_to must be 'LOS'`);
          }
        }
      }

      // Validate oob is boolean if present
      if (entryObj.oob !== undefined && typeof entryObj.oob !== 'boolean') {
        errors.push(`Dice sum ${sum} oob must be boolean`);
      }

      // Validate tags array if present
      if (entryObj.tags !== undefined) {
        if (!Array.isArray(entryObj.tags)) {
          errors.push(`Dice sum ${sum} tags must be an array`);
        } else {
          for (const tag of entryObj.tags) {
            if (typeof tag !== 'string') {
              errors.push(`Dice sum ${sum} tags must contain only strings`);
              break;
            }
          }
        }
      }
    }

    // Validate doubles outcomes
    const doubles = parsedTable.doubles;
    if (!doubles['1'] || !doubles['20']) {
      errors.push('Doubles outcomes for 1 and 20 are required');
    }

    if (!doubles['2-19']?.penalty_table_ref) {
      errors.push('Penalty table reference required for 2-19 doubles');
    }

    // Validate meta fields
    const meta = parsedTable.meta;
    if (meta.explosive_start_sum < 20 || meta.explosive_start_sum > 39) {
      errors.push('Explosive start sum must be between 20 and 39');
    }

    // Validate field position clamping if enabled
    if (meta.field_pos_clamp) {
      // Use sample game states to test field position clamping
      const sampleStates = [
        { ballOn: 10, toGo: 10 }, // Near own goal line
        { ballOn: 50, toGo: 10 }, // Midfield
        { ballOn: 90, toGo: 10 }, // Near opponent goal line
      ];

      for (const sampleState of sampleStates) {
        for (const [sum, entry] of Object.entries(parsedTable.entries)) {
          if (entry.yards !== undefined) {
            const clampedYards = clampFieldPosition(entry.yards, sampleState.ballOn);

            // Check that clamped yards don't exceed field boundaries inappropriately
            if (sampleState.ballOn + clampedYards > 100) {
              // Should result in touchdown (yards = remaining distance)
              if (clampedYards !== 100 - sampleState.ballOn) {
                errors.push(`Field clamp validation failed for sum ${sum} at position ${sampleState.ballOn}: expected clamped yards ${100 - sampleState.ballOn}, got ${clampedYards}`);
              }
            } else if (sampleState.ballOn + clampedYards < 0) {
              // Should result in safety (yards = -current position)
              if (clampedYards !== -sampleState.ballOn) {
                errors.push(`Field clamp validation failed for sum ${sum} at position ${sampleState.ballOn}: expected clamped yards ${-sampleState.ballOn}, got ${clampedYards}`);
              }
            }
          }
        }
      }
    }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`),
        warnings,
      };
    }

    return {
      isValid: false,
      errors: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
    };
  }
}

/**
 * Validates that a penalty table has exactly 10 slots with correct structure
 */
export function validatePenaltyTable(table: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // First validate the basic schema
    const parsedTable = z.object({
      version: z.string(),
      entries: z.object({
        '1': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '2': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '3': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '4': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '5': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '6': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '7': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '8': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '9': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
        '10': z.object({
          side: z.enum(['offense', 'defense', 'offset']),
          yards: z.number().int().optional(),
          auto_first_down: z.boolean().optional(),
          loss_of_down: z.boolean().optional(),
          replay_down: z.boolean().optional(),
          override_play_result: z.boolean().optional(),
          label: z.string(),
        }),
      }),
    }).parse(table);

    // Additional validation logic can be added here if needed
    // For example, checking that penalty yardages are reasonable

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`),
        warnings,
      };
    }

    return {
      isValid: false,
      errors: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
    };
  }
}

/**
 * Validates a complete table set (matchup tables and penalty tables)
 */
export function validateTableSet(
  tables: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let allValid = true;

  for (const [tableName, tableData] of Object.entries(tables)) {
    // Determine table type based on content
    if (typeof tableData === 'object' && tableData !== null) {
      const data = tableData as Record<string, unknown>;

      if (data.dice === '2d20') {
        // This is a matchup table
        const result = validateMatchupTable(tableData);
        if (!result.isValid) {
          allValid = false;
          errors.push(`Matchup table '${tableName}': ${result.errors.join(', ')}`);
        }
        warnings.push(...result.warnings.map(w => `Matchup table '${tableName}': ${w}`));
      } else if (data.entries && Array.isArray((data.entries as any))) {
        // This might be a penalty table
        const result = validatePenaltyTable(tableData);
        if (!result.isValid) {
          allValid = false;
          errors.push(`Penalty table '${tableName}': ${result.errors.join(', ')}`);
        }
        warnings.push(...result.warnings.map(w => `Penalty table '${tableName}': ${w}`));
      }
    }
  }

  return {
    isValid: allValid,
    errors,
    warnings,
  };
}
