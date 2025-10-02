import type { MatchupTable, DiceOutcome } from '../../data/schemas/MatchupTable.js';
import { MatchupTableSchema } from '../../data/schemas/MatchupTable.js';
import { validateDistributionRequirements } from './DistributionPreview.js';
import { getErrorMessage } from '../../utils/EventBus';

/**
 * ValidationFeedback.ts - Real-time validation and feedback for table authoring
 *
 * Provides immediate feedback on table structure, balance, and GDD compliance during authoring.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number; // 0-100 compliance score
}

export interface ValidationError {
  type: 'error';
  category: 'schema' | 'gdd' | 'balance' | 'structure';
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'warning';
  category: 'balance' | 'style' | 'consistency' | 'gdd' | 'structure';
  message: string;
  suggestion?: string;
}

export interface ValidationSuggestion {
  type: 'suggestion';
  category: 'optimization' | 'balance' | 'playbook';
  message: string;
  action?: string;
}

/**
 * Validates a table and provides comprehensive feedback
 */
export function validateTableWithFeedback(table: MatchupTable): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];

  let score = 100;

  // 1. Schema validation
  try {
    MatchupTableSchema.parse(table);
  } catch (error) {
    if (error instanceof Error) {
      errors.push({
        type: 'error',
        category: 'schema',
        message: `Schema validation failed: ${error.message}`,
        suggestion: 'Check the table structure against the MatchupTable schema'
      });
      score -= 30;
    }
  }

  // 2. GDD requirements validation
  const gddIssues = validateGddRequirements(table);
  errors.push(...gddIssues.errors);
  warnings.push(...gddIssues.warnings);
  score -= gddIssues.errors.length * 15;
  score -= gddIssues.warnings.length * 5;

  // 3. Distribution analysis
  const distributionValidation = validateDistributionRequirements(table);
  if (!distributionValidation.valid) {
    distributionValidation.issues.forEach(issue => {
      errors.push({
        type: 'error',
        category: 'balance',
        message: issue,
        suggestion: 'Review yardage values for this outcome range'
      });
    });
    score -= 20;
  }

  // 4. Balance analysis
  const balanceAnalysis = analyzeBalanceCharacteristics(table);
  warnings.push(...balanceAnalysis.warnings);
  suggestions.push(...balanceAnalysis.suggestions);
  score -= balanceAnalysis.warnings.length * 3;

  // 5. Structural consistency checks
  const structureIssues = validateStructuralConsistency(table);
  warnings.push(...structureIssues.warnings);
  suggestions.push(...structureIssues.suggestions);
  score -= structureIssues.warnings.length * 2;

  // 6. Playbook identity suggestions
  const identitySuggestions = suggestPlaybookIdentity(table);
  suggestions.push(...identitySuggestions);

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score
  };
}

/**
 * Validates GDD-specific requirements
 */
function validateGddRequirements(table: MatchupTable): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check turnover band (3-5)
  const turnoverBandSums = ['3', '4', '5'];
  const missingTurnoverBand = turnoverBandSums.filter(sum => !(table.entries as any)[sum]);

  if (missingTurnoverBand.length > 0) {
    errors.push({
      type: 'error',
      category: 'gdd',
      message: `Missing turnover band entries: ${missingTurnoverBand.join(', ')}`,
      suggestion: 'Add entries for sums 3-5 to meet GDD turnover band requirement'
    });
  }

  // Check for doubles entries
  if (!table.doubles || !table.doubles['1'] || !table.doubles['20'] || !table.doubles['2-19']) {
    errors.push({
      type: 'error',
      category: 'gdd',
      message: 'Missing doubles entries (1, 20, 2-19)',
      suggestion: 'Add all three doubles outcomes as required by GDD'
    });
  }

  // Check field position clamp setting
  if (table.meta.field_pos_clamp === false) {
    warnings.push({
      type: 'warning',
      category: 'gdd',
      message: 'Field position clamping disabled - ensure yards never exceed remaining field',
      suggestion: 'Consider enabling field_pos_clamp for safer gameplay'
    });
  }

  return { errors, warnings };
}

/**
 * Analyzes balance characteristics and provides feedback
 */
function analyzeBalanceCharacteristics(table: MatchupTable): { warnings: ValidationWarning[]; suggestions: ValidationSuggestion[] } {
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];

  const outcomes = Object.values(table.entries);
  const yards = outcomes.map(o => o.yards);

  // Calculate statistics
  const avgYards = yards.reduce((sum, y) => sum + y, 0) / yards.length;
  const explosiveCount = yards.filter(y => y >= 20).length;
  const explosiveRate = (explosiveCount / yards.length) * 100;

  // Check explosive rate balance
  if (explosiveRate > 25) {
    warnings.push({
      type: 'warning',
      category: 'balance',
      message: `High explosive rate (${explosiveRate.toFixed(1)}%) may create scoring imbalance`,
      suggestion: 'Consider reducing some high-yardage outcomes'
    });
  } else if (explosiveRate < 15) {
    suggestions.push({
      type: 'suggestion',
      category: 'balance',
      message: 'Explosive rate is below typical range - consider adding more big plays',
      action: 'Increase yardage for some 20+ sum outcomes'
    });
  }

  // Check for extreme yardage values
  const maxYards = Math.max(...yards);
  const minYards = Math.min(...yards);

  if (maxYards > 80) {
    warnings.push({
      type: 'warning',
      category: 'balance',
      message: `Very high maximum yards (${maxYards}) may create unrealistic outcomes`,
      suggestion: 'Consider capping extreme yardage values'
    });
  }

  if (minYards < 0) {
    warnings.push({
      type: 'warning',
      category: 'balance',
      message: 'Negative yardage values detected',
      suggestion: 'Use 0 for no gain rather than negative values'
    });
  }

  // Check clock distribution
  const clockCounts = { '10': 0, '20': 0, '30': 0 };
  outcomes.forEach(o => {
    clockCounts[o.clock] = (clockCounts[o.clock] || 0) + 1;
  });

  const totalClocks = outcomes.length;
  Object.entries(clockCounts).forEach(([clock, count]) => {
    const percentage = (count / totalClocks) * 100;
    if (percentage < 20) {
      warnings.push({
        type: 'warning',
        category: 'balance',
        message: `Low usage of ${clock}s clock (${percentage.toFixed(1)}%)`,
        suggestion: `Consider using ${clock}s clock more frequently for variety`
      });
    }
  });

  return { warnings, suggestions };
}

/**
 * Validates structural consistency
 */
function validateStructuralConsistency(table: MatchupTable): { warnings: ValidationWarning[]; suggestions: ValidationSuggestion[] } {
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];

  const entries = Object.entries(table.entries);

  // Check for missing sums in 3-39 range
  const expectedSums = Array.from({ length: 37 }, (_, i) => (i + 3).toString());
  const missingSums = expectedSums.filter(sum => !(table.entries as any)[sum]);

  if (missingSums.length > 0) {
    warnings.push({
      type: 'warning',
      category: 'structure',
      message: `Missing entries for sums: ${missingSums.slice(0, 5).join(', ')}${missingSums.length > 5 ? '...' : ''}`,
      suggestion: 'Fill in all sum entries from 3-39 for complete coverage'
    });
  }

  // Check for duplicate yardage patterns (potential copy-paste errors)
  const yardagePatterns = entries.map(([, outcome]) => `${outcome.yards}-${outcome.clock}`);
  const uniquePatterns = new Set(yardagePatterns);
  const duplicateRate = ((entries.length - uniquePatterns.size) / entries.length) * 100;

  if (duplicateRate > 30) {
    warnings.push({
      type: 'warning',
      category: 'consistency',
      message: `High pattern duplication (${duplicateRate.toFixed(1)}%) - possible copy-paste errors`,
      suggestion: 'Review entries for unintentional duplicates'
    });
  }

  // Suggest turnover variety in turnover band
  const turnoverBandSums = ['3', '4', '5'];
  const turnoverOutcomes = turnoverBandSums
    .filter(sum => sum in table.entries)
    .map(sum => table.entries[sum])
    .filter(outcome => outcome.turnover);

  if (turnoverOutcomes.length === 0) {
    suggestions.push({
      type: 'suggestion',
      category: 'balance',
      message: 'Consider adding turnovers to the 3-5 sum range for strategic variety',
      action: 'Add turnover outcomes to sums 3-5'
    });
  }

  return { warnings, suggestions };
}

/**
 * Suggests playbook identity improvements
 */
function suggestPlaybookIdentity(table: MatchupTable): ValidationSuggestion[] {
  const suggestions: ValidationSuggestion[] = [];

  const outcomes = Object.values(table.entries);
  const avgYards = outcomes.reduce((sum, o) => sum + o.yards, 0) / outcomes.length;
  const explosiveRate = (outcomes.filter(o => o.yards >= 20).length / outcomes.length) * 100;

  // Suggest based on characteristics
  if (avgYards > 7 && explosiveRate > 20) {
    suggestions.push({
      type: 'suggestion',
      category: 'playbook',
      message: 'Table shows Air Raid characteristics - consider Air Raid playbook identity',
      action: 'Set risk_profile to "high" and adjust explosive_start_sum to 20-22'
    });
  } else if (avgYards < 5 && explosiveRate < 15) {
    suggestions.push({
      type: 'suggestion',
      category: 'playbook',
      message: 'Table shows Smashmouth characteristics - consider Smashmouth playbook identity',
      action: 'Set risk_profile to "low" and focus on consistent, moderate gains'
    });
  }

  return suggestions;
}

/**
 * Provides real-time validation for individual entries
 */
export function validateEntry(entry: DiceOutcome, sum: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];

  // Validate yards
  if (entry.yards < 0) {
    errors.push({
      type: 'error',
      category: 'structure',
      message: 'Yards cannot be negative',
      field: 'yards',
      suggestion: 'Use 0 for no gain'
    });
  }

  if (entry.yards > 100) {
    warnings.push({
      type: 'warning',
      category: 'balance',
      message: 'Very high yardage may create unrealistic outcomes',
      suggestion: 'Consider if this yardage is appropriate for the situation'
    });
  }

  // Validate clock
  if (!['10', '20', '30'].includes(entry.clock)) {
    errors.push({
      type: 'error',
      category: 'structure',
      message: 'Clock must be 10, 20, or 30',
      field: 'clock',
      suggestion: 'Use one of the allowed clock values'
    });
  }

  // Validate turnover
  if (entry.turnover) {
    if (!['INT', 'FUM'].includes(entry.turnover.type)) {
      errors.push({
        type: 'error',
        category: 'structure',
        message: 'Turnover type must be INT or FUM',
        field: 'turnover.type',
        suggestion: 'Use INT for interception or FUM for fumble'
      });
    }

    if (entry.turnover.return_yards < 0) {
      errors.push({
        type: 'error',
        category: 'structure',
        message: 'Turnover return yards cannot be negative',
        field: 'turnover.return_yards',
        suggestion: 'Use 0 or positive value for return yards'
      });
    }

    if (entry.turnover.return_to && entry.turnover.return_to !== 'LOS') {
      errors.push({
        type: 'error',
        category: 'structure',
        message: 'Turnover return_to must be LOS',
        field: 'turnover.return_to',
        suggestion: 'Use LOS for line of scrimmage return'
      });
    }
  }

  // Sum-specific suggestions
  if (sum >= 3 && sum <= 5 && !entry.turnover) {
    suggestions.push({
      type: 'suggestion',
      category: 'balance',
      message: `Sum ${sum} is in turnover band - consider adding turnover outcome`,
      action: 'Add turnover for strategic variety in low-sum outcomes'
    });
  }

  if (sum >= 20 && entry.yards < 15) {
    suggestions.push({
      type: 'suggestion',
      category: 'balance',
      message: `Sum ${sum} could benefit from more explosive yardage`,
      action: 'Consider increasing yards for this high-sum outcome'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  };
}

/**
 * Formats validation results for display
 */
export function formatValidationOutput(result: ValidationResult): string {
  let output = '';

  if (result.errors.length > 0) {
    output += '\n❌ Errors:\n';
    result.errors.forEach(error => {
      output += `  • ${getErrorMessage(error)}`;
      if (error.field) output += ` (${error.field})`;
      output += '\n';
      if (error.suggestion) output += `    💡 ${error.suggestion}\n`;
    });
  }

  if (result.warnings.length > 0) {
    output += '\n⚠️  Warnings:\n';
    result.warnings.forEach(warning => {
      output += `  • ${warning.message}\n`;
      if (warning.suggestion) output += `    💡 ${warning.suggestion}\n`;
    });
  }

  if (result.suggestions.length > 0) {
    output += '\n💡 Suggestions:\n';
    result.suggestions.forEach(suggestion => {
      output += `  • ${suggestion.message}\n`;
      if (suggestion.action) output += `    🔧 ${suggestion.action}\n`;
    });
  }

  output += `\n📊 Compliance Score: ${result.score}/100\n`;

  if (result.isValid && result.score >= 80) {
    output += '✅ Table is well-formed and balanced!\n';
  } else if (result.score >= 60) {
    output += '⚠️  Table is usable but could benefit from improvements.\n';
  } else {
    output += '❌ Table needs significant improvements before use.\n';
  }

  return output;
}
