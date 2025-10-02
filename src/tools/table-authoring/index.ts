/**
 * Table Authoring Tools - Index
 *
 * Exports all table authoring utilities for external use
 */

export { scaffoldMatchupTable, suggestTableName, validateTableName } from './TableScaffolder.js';
export { parseCsvContent, validateCsvFormat } from './CsvImporter.js';
export {
  analyzeDistribution,
  createSimpleChart,
  validateDistributionRequirements
} from './DistributionPreview.js';
export {
  validateTableWithFeedback,
  validateEntry,
  formatValidationOutput
} from './ValidationFeedback.js';

// Re-export types for convenience
export type {
  ScaffoldingOptions,
  ScaffoldingResult
} from './TableScaffolder.js';

export type {
  CsvParseResult,
  CsvRow
} from './CsvImporter.js';

export type {
  DistributionAnalysis,
  DistributionBin,
  PreviewOptions
} from './DistributionPreview.js';

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion
} from './ValidationFeedback.js';
