import type { MatchupTable, DiceOutcome } from '../../data/schemas/MatchupTable.js';
import { MatchupTableSchema } from '../../data/schemas/MatchupTable.js';
import { z } from 'zod';
import { getErrorMessage } from '../../utils/EventBus';

/**
 * CsvImporter.ts - Utilities for importing dice tables from CSV/Sheets data
 *
 * Supports bulk table creation from spreadsheet data with validation and error reporting.
 */

export interface CsvParseResult {
  tables: Record<string, MatchupTable>;
  errors: string[];
  warnings: string[];
  metadata: {
    totalRows: number;
    validTables: number;
    skippedRows: number;
  };
}

export interface CsvRow {
  table_name?: string;
  off_card?: string;
  def_card?: string;
  dice_sum?: string;
  yards?: string;
  clock?: string;
  tags?: string;
  turnover_type?: string;
  turnover_return_yards?: string;
  turnover_return_to?: string;
  oob?: string;
  doubles_1?: string;
  doubles_20?: string;
  doubles_2_19_penalty_ref?: string;
  meta_oob_bias?: string;
  meta_field_pos_clamp?: string;
  meta_risk_profile?: string;
  meta_explosive_start_sum?: string;
}

/**
 * CSV column schema for validation
 */
const CsvRowSchema = z.object({
  table_name: z.string().optional(),
  off_card: z.string().optional(),
  def_card: z.string().optional(),
  dice_sum: z.string().optional(),
  yards: z.string().optional(),
  clock: z.string().optional(),
  tags: z.string().optional(),
  turnover_type: z.string().optional(),
  turnover_return_yards: z.string().optional(),
  turnover_return_to: z.string().optional(),
  oob: z.string().optional(),
  doubles_1: z.string().optional(),
  doubles_20: z.string().optional(),
  doubles_2_19_penalty_ref: z.string().optional(),
  meta_oob_bias: z.string().optional(),
  meta_field_pos_clamp: z.string().optional(),
  meta_risk_profile: z.string().optional(),
  meta_explosive_start_sum: z.string().optional(),
});

/**
 * Parses CSV content and creates matchup tables
 */
export function parseCsvContent(csvContent: string): CsvParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tables: Record<string, MatchupTable> = {};

  let totalRows = 0;
  let validTables = 0;
  let skippedRows = 0;

  try {
    // Split CSV into lines and parse
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
      errors.push('CSV file is empty');
      return { tables: {}, errors, warnings, metadata: { totalRows: 0, validTables: 0, skippedRows: 0 } };
    }

    // Parse header row to validate column structure
    const headerLine = lines[0];
    if (!headerLine) {
      errors.push('CSV file has no header row');
      return { tables: {}, errors, warnings, metadata: { totalRows: 0, validTables: 0, skippedRows: 0 } };
    }
    const headers = (parseCsvRow(headerLine) || []) as string[];

    // Validate required headers for different row types
    const hasTableHeaders = headers.some(h => ['table_name', 'off_card', 'def_card'].includes(h));
    const hasEntryHeaders = headers.some(h => ['dice_sum', 'yards', 'clock'].includes(h));

    if (!hasTableHeaders && !hasEntryHeaders) {
      errors.push('CSV must contain either table metadata columns (table_name, off_card, def_card) or entry columns (dice_sum, yards, clock)');
    }

    // Process data rows
    let lastTableName: string | undefined;
    for (let i = 1; i < lines.length; i++) {
      totalRows++;
      const line = lines[i];

      try {
        const row = parseCsvRowToObject(line || '', headers as string[]);
        const parseResult = CsvRowSchema.safeParse(row);

        if (!parseResult.success) {
          errors.push(`Row ${i + 1}: Invalid data format - ${getErrorMessage(parseResult.error)}`);
          skippedRows++;
          continue;
        }

        const csvRow = parseResult.data;

        // Determine row type and process accordingly
        const hasMeta = !!(csvRow.table_name && csvRow.off_card && csvRow.def_card);
        const hasEntry = !!(csvRow.dice_sum && (csvRow.yards !== undefined || csvRow.clock !== undefined));

        if (hasEntry) {
          // Entry-first pathway: validate dice_sum before creating/using table
          const targetTableName = csvRow.table_name || lastTableName;
          if (!targetTableName && !hasMeta) {
            errors.push(`Row ${i + 1}: Entry row without prior table metadata`);
            skippedRows++;
            continue;
          }

          // Validate dice_sum early; if invalid, do not create table
          const sumNum = parseInt(csvRow.dice_sum!);
          if (isNaN(sumNum) || sumNum < 3 || sumNum > 39) {
            errors.push(`Row ${i + 1}: Invalid dice_sum: ${csvRow.dice_sum} (must be 3-39)`);
            skippedRows++;
            continue;
          }

          let tableNameToUse = targetTableName as string | undefined;
          // Ensure table exists: create if metadata present and not yet created
          if (!tableNameToUse && hasMeta) {
            tableNameToUse = csvRow.table_name as string;
          }
          if (!tableNameToUse) {
            errors.push(`Row ${i + 1}: Entry row without prior table metadata`);
            skippedRows++;
            continue;
          }
          if (!tables[tableNameToUse]) {
            if (hasMeta) {
              const meta = processTableMetadataRow({ ...csvRow, table_name: tableNameToUse }, i + 1);
              if (meta.error || !meta.table || !meta.tableName) {
                errors.push(`Row ${i + 1}: ${meta.error || 'Unable to create table from metadata'}`);
                skippedRows++;
                continue;
              }
              if (tables[meta.tableName]) {
                errors.push(`Row ${i + 1}: Duplicate table name '${meta.tableName}'`);
                skippedRows++;
                continue;
              }
              tables[meta.tableName] = meta.table;
              lastTableName = meta.tableName;
              validTables++;
            } else {
              errors.push(`Row ${i + 1}: Entry specifies unknown table '${tableNameToUse}' - skipping`);
              skippedRows++;
              continue;
            }
          } else if (hasMeta) {
            // If table exists but metadata conflicts, treat as duplicate name
            const existing = tables[tableNameToUse]!;
            if (existing.off_card !== csvRow.off_card || existing.def_card !== csvRow.def_card) {
              errors.push(`Row ${i + 1}: Duplicate table name '${tableNameToUse}'`);
              skippedRows++;
              continue;
            }
          }

          const result = processEntryRow({ ...csvRow, table_name: tableNameToUse }, tables, i + 1);
          if (result.error) {
            errors.push(`Row ${i + 1}: ${result.error}`);
            skippedRows++;
          } else if (result.warning) {
            warnings.push(`Row ${i + 1}: ${result.warning}`);
          }
        } else if (hasMeta) {
          // Pure metadata row (no entry); create table immediately
          const result = processTableMetadataRow(csvRow, i + 1);
          if (result.error) {
            errors.push(`Row ${i + 1}: ${result.error}`);
            skippedRows++;
          } else if (result.table && result.tableName) {
            if (tables[result.tableName]) {
              errors.push(`Row ${i + 1}: Duplicate table name '${result.tableName}'`);
              skippedRows++;
            } else {
              tables[result.tableName] = result.table;
              lastTableName = result.tableName;
              validTables++;
            }
          }
        } else {
          // Skip rows that don't match expected patterns
          skippedRows++;
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: Unexpected error - ${getErrorMessage(error)}`);
        skippedRows++;
      }
    }

  // Optionally validate created tables; keep metadata-only tables
  for (const [tableName, table] of Object.entries(tables)) {
    const hasEntries = Object.keys((table as any).entries || {}).length > 0;
    if (!hasEntries) continue; // keep metadata tables without strict validation
    const validation = MatchupTableSchema.safeParse(table as any);
    if (!validation.success) {
      warnings.push(`Table '${tableName}' validation warnings: ${(validation.error as any).issues?.length ?? 1} issues`);
    }
  }

  } catch (error) {
    errors.push(`Failed to parse CSV: ${getErrorMessage(error)}`);
  }

  return { tables, errors, warnings, metadata: { totalRows, validTables, skippedRows } };
}

/**
 * Simple CSV row parser (handles quoted fields and commas)
 */
function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add final field
  result.push(current.trim());

  return result;
}

/**
 * Converts CSV row array to object using headers
 */
function parseCsvRowToObject(row: string, headers: string[]): CsvRow {
  const values = parseCsvRow(row || '');
  const result: CsvRow = {};

  (headers || []).forEach((header, index) => {
    const value = values[index] || '';
    if (value) {
      (result as any)[header] = value;
    }
  });

  return result;
}

/**
 * Processes a table metadata row
 */
function processTableMetadataRow(csvRow: z.infer<typeof CsvRowSchema>, rowNumber: number): { tableName?: string; table?: MatchupTable; error?: string } {
  const { table_name, off_card, def_card } = csvRow;

  if (!table_name || !off_card || !def_card) {
    return { error: 'Table metadata rows must include table_name, off_card, and def_card' };
  }

  // Duplicate detection handled by caller

  try {
    // Create basic table structure
    const table: MatchupTable = {
      version: '1.0.0',
      off_card,
      def_card,
      dice: '2d20',
      entries: {} as any,
      doubles: {
        '1': { result: csvRow.doubles_1 === 'DEF_TD' ? 'DEF_TD' : 'DEF_TD' }, // Default to DEF_TD
        '20': { result: csvRow.doubles_20 === 'OFF_TD' ? 'OFF_TD' : 'OFF_TD' }, // Default to OFF_TD
        '2-19': { penalty_table_ref: csvRow.doubles_2_19_penalty_ref || 'default_penalty' }
      },
      meta: {
        oob_bias: csvRow.meta_oob_bias === 'true',
        field_pos_clamp: csvRow.meta_field_pos_clamp !== 'false', // Default to true
        risk_profile: (['low', 'medium', 'high'].includes(csvRow.meta_risk_profile || '') ? csvRow.meta_risk_profile : 'medium') as 'low' | 'medium' | 'high',
        explosive_start_sum: parseInt(csvRow.meta_explosive_start_sum || '22') || 22
      }
    };

    return { tableName: table_name, table };
  } catch (error) {
    return { error: `Failed to create table: ${getErrorMessage(error)}` };
  }
}

/**
 * Processes an entry row (adds to existing table)
 */
function processEntryRow(csvRow: z.infer<typeof CsvRowSchema>, tables: Record<string, MatchupTable>, rowNumber: number): { error?: string; warning?: string } {
  const { table_name, dice_sum, yards, clock, tags, turnover_type, turnover_return_yards, turnover_return_to, oob } = csvRow;

  if (!table_name) {
    return { error: 'Entry rows must specify table_name' };
  }

  if (!dice_sum) {
    return { error: 'Entry rows must specify dice_sum' };
  }

  const table = tables[table_name];
  if (!table) {
    return { warning: `Entry specifies unknown table '${table_name}' - skipping` };
  }

  const sumNum = parseInt(dice_sum);
  if (isNaN(sumNum) || sumNum < 3 || sumNum > 39) {
    return { error: `Invalid dice_sum: ${dice_sum} (must be 3-39)` };
  }

  try {
    // Validate yards if provided (missing is allowed and defaults to 0)
    if (typeof yards === 'string' && yards.trim() !== '' && isNaN(parseInt(yards))) {
      return { error: `Invalid yards value: ${yards}` };
    }
    const entry: DiceOutcome = {
      yards: parseInt(yards || '0') || 0,
      clock: (['10', '20', '30'].includes(clock || '') ? clock : '20') as '10' | '20' | '30',
      ...(tags && { tags: tags.split(',').map(t => t.trim()).filter(t => t) }),
      ...(oob === 'true' && { oob: true })
    } as DiceOutcome;

    // Add turnover if specified
    if (turnover_type) {
      (entry as any).turnover = {
        type: turnover_type as 'INT' | 'FUM',
        return_yards: parseInt(turnover_return_yards || '0') || 0,
        return_to: (turnover_return_to === 'LOS' ? 'LOS' : 'LOS') as 'LOS'
      };
    }

    (table.entries as any)[sumNum.toString()] = entry as any;
    return {};
  } catch (error) {
    return { error: `Failed to create entry for sum ${dice_sum}: ${getErrorMessage(error)}` };
  }
}

/**
 * Validates CSV format before processing
 */
export function validateCsvFormat(csvContent: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    errors.push('CSV content is empty');
    return { valid: false, errors, warnings };
  }

  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length === 0) {
    errors.push('CSV has no data rows');
    return { valid: false, errors, warnings };
  }

  // Parse header and validate required columns
  const headerLine = lines[0];
  if (!headerLine || !headerLine.includes(',')) {
    errors.push('First row does not appear to be a valid CSV header');
  } else {
    const headers = parseCsvRow(headerLine);
    const hasTableHeaders = headers.some(h => ['table_name', 'off_card', 'def_card'].includes(h));
    const hasEntryHeaders = headers.some(h => ['dice_sum', 'yards', 'clock'].includes(h));
    if (!hasTableHeaders) {
      errors.push('CSV does not contain recognizable table metadata columns');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
