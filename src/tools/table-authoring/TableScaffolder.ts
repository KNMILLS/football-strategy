import type { MatchupTable, DiceOutcome } from '../../data/schemas/MatchupTable.js';
import { MatchupTableSchema } from '../../data/schemas/MatchupTable.js';
import { getErrorMessage } from '../../utils/EventBus';

/**
 * TableScaffolder.ts - Utilities for creating new dice tables with proper structure
 *
 * Provides programmatic table creation with GDD-compliant defaults and validation.
 */

export interface ScaffoldingOptions {
  offCard: string;
  defCard: string;
  oobBias?: boolean;
  fieldPosClamp?: boolean;
  riskProfile?: 'low' | 'medium' | 'high';
  explosiveStartSum?: number;
  template?: 'conservative' | 'aggressive' | 'balanced';
}

export interface ScaffoldingResult {
  table: MatchupTable;
  warnings: string[];
  suggestions: string[];
}

/**
 * Creates a new matchup table with GDD-compliant structure and sensible defaults
 */
export function scaffoldMatchupTable(options: ScaffoldingOptions): ScaffoldingResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate inputs
  if (!options.offCard || !options.defCard) {
    throw new Error('offCard and defCard are required');
  }

  if (options.explosiveStartSum !== undefined && (options.explosiveStartSum < 20 || options.explosiveStartSum > 39)) {
    warnings.push('explosiveStartSum should be between 20-39');
  }

  // Set defaults based on template
  const defaults = getTemplateDefaults(options.template || 'balanced');

  // Create base table structure with all required entries initialized
  const table: MatchupTable = {
    version: '1.0.0',
    off_card: options.offCard,
    def_card: options.defCard,
    dice: '2d20',
    entries: {} as any, // Will be populated in the loop below
    doubles: {
      '1': { result: 'DEF_TD' },
      '20': { result: 'OFF_TD' },
      '2-19': { penalty_table_ref: 'default_penalty' }
    },
    meta: {
      oob_bias: options.oobBias ?? defaults.oobBias,
      field_pos_clamp: options.fieldPosClamp ?? defaults.fieldPosClamp,
      risk_profile: options.riskProfile ?? defaults.riskProfile,
      explosive_start_sum: options.explosiveStartSum ?? defaults.explosiveStartSum
    }
  };

  // Generate entries for sums 3-39 with template-based defaults
  for (let sum = 3; sum <= 39; sum++) {
    const entry = createEntryForSum(sum, defaults, options.template || 'balanced');
    table.entries[sum.toString()] = entry;

    // Add suggestions for turnover band (3-5)
    if (sum >= 3 && sum <= 5) {
      suggestions.push(`Consider turnover outcomes for sum ${sum} to meet GDD requirements`);
    }
  }

  // Validate the generated table
  try {
    MatchupTableSchema.parse(table);
  } catch (error) {
    warnings.push(`Generated table failed validation: ${getErrorMessage(error)}`);
  }

  return { table, warnings, suggestions };
}

/**
 * Gets default values based on the specified template
 */
function getTemplateDefaults(template: 'conservative' | 'aggressive' | 'balanced') {
  const templates = {
    conservative: {
      oobBias: false,
      fieldPosClamp: true,
      riskProfile: 'low' as const,
      explosiveStartSum: 25,
      avgYards: 4,
      clockDistribution: { '10': 40, '20': 35, '30': 25 }
    },
    aggressive: {
      oobBias: true,
      fieldPosClamp: false,
      riskProfile: 'high' as const,
      explosiveStartSum: 20,
      avgYards: 8,
      clockDistribution: { '10': 25, '20': 30, '30': 45 }
    },
    balanced: {
      oobBias: false,
      fieldPosClamp: true,
      riskProfile: 'medium' as const,
      explosiveStartSum: 22,
      avgYards: 6,
      clockDistribution: { '10': 33, '20': 34, '30': 33 }
    }
  };

  return templates[template];
}

/**
 * Creates a dice outcome entry for a specific sum using template logic
 */
function createEntryForSum(sum: number, defaults: ReturnType<typeof getTemplateDefaults>, template: string): DiceOutcome {
  const { avgYards, clockDistribution } = defaults;

  // Calculate yards based on sum and template characteristics
  let yards = Math.round(avgYards + (sum - 21) * 0.3);

  // Apply template-specific adjustments
  switch (template) {
    case 'conservative':
      yards = Math.max(0, yards - 1); // Slightly more conservative
      break;
    case 'aggressive':
      yards = yards + 2; // More aggressive yardage
      break;
    case 'balanced':
      // Use calculated yards as-is
      break;
  }

  // Ensure yards are reasonable (0-100 range)
  yards = Math.max(0, Math.min(100, yards));

  // Select clock based on weighted distribution
  const clock = selectClockByWeight(clockDistribution);

  // Add turnover for low sums (3-5) in conservative/aggressive templates
  let turnover;
  if ((sum <= 5) && (template === 'conservative' || template === 'aggressive')) {
    turnover = {
      type: 'FUM' as const,
      return_yards: 0,
      return_to: 'LOS' as const
    };
  }

  return {
    yards,
    clock,
    tags: [`sum_${sum}`, template],
    ...(turnover && { turnover })
  };
}

/**
 * Selects a clock value based on weighted distribution
 */
function selectClockByWeight(distribution: Record<string, number>): '10' | '20' | '30' {
  const total = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
  // Use a fixed pseudo-random selection derived from weights for determinism in tooling
  let random = (Object.keys(distribution).length % 97) / 97 * total;

  for (const [clock, weight] of Object.entries(distribution)) {
    random -= weight;
    if (random <= 0) {
      return clock as '10' | '20' | '30';
    }
  }

  return '20'; // Fallback
}

/**
 * Validates a table name follows conventions
 */
export function validateTableName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Table name cannot be empty' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Table name too long (max 50 characters)' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { valid: false, error: 'Table name can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true };
}

/**
 * Suggests a table name based on offense and defense cards
 */
export function suggestTableName(offCard: string, defCard: string): string {
  // Extract key characteristics from card names
  const offWords = offCard.toLowerCase().split(/[\s_-]+/);
  const defWords = defCard.toLowerCase().split(/[\s_-]+/);

  // Create a descriptive name combining key elements
  const offKey = offWords.find(word => ['west', 'coast', 'air', 'raid', 'spread', 'smashmouth', 'pro', 'style'].includes(word)) || 'offense';
  const defKey = defWords.find(word => ['blitz', 'coverage', 'rush', 'zone'].includes(word)) || 'defense';

  return `${offKey}_${defKey}`;
}
