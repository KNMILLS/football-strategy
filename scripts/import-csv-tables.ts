#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsvContent, validateCsvFormat } from '../src/tools/table-authoring/CsvImporter.js';
import { validateTableWithFeedback, formatValidationOutput } from '../src/tools/table-authoring/ValidationFeedback.js';
import { createSimpleChart } from '../src/tools/table-authoring/DistributionPreview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI tool for importing dice tables from CSV/Sheets data
 *
 * Usage: node scripts/import-csv-tables.mjs <csv-file> [options]
 */

const USAGE = `
📥 CSV Table Importer - Import tables from spreadsheet data

Usage:
  node scripts/import-csv-tables.mjs <csv-file> [options]

Arguments:
  csv-file        Path to CSV file containing table data

Options:
  --output-dir <dir>    Output directory for generated JSON files (default: data/)
  --validate-only       Only validate CSV, don't create files
  --preview-chart       Show distribution charts for imported tables
  --format <format>     CSV format: auto, standard, sheets (default: auto)
  --skip-validation     Skip validation of imported tables
  --dry-run            Show what would be imported without creating files

Examples:
  node scripts/import-csv-tables.mjs playbook_data.csv
  node scripts/import-csv-tables.mjs sheets_export.csv --output-dir custom_tables/
  node scripts/import-csv-tables.mjs data.csv --validate-only --preview-chart
`;

function showUsage() {
  console.log(USAGE);
}

/**
 * Parses command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    csvFile: null,
    outputDir: 'data',
    validateOnly: false,
    previewChart: false,
    format: 'auto',
    skipValidation: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output-dir':
        options.outputDir = args[++i];
        break;

      case '--validate-only':
        options.validateOnly = true;
        break;

      case '--preview-chart':
        options.previewChart = true;
        break;

      case '--format':
        options.format = args[++i];
        if (!['auto', 'standard', 'sheets'].includes(options.format)) {
          console.error(`❌ Invalid format: ${options.format}`);
          showUsage();
          process.exit(1);
        }
        break;

      case '--skip-validation':
        options.skipValidation = true;
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--help':
      case '-h':
        showUsage();
        process.exit(0);
        break;

      default:
        if (arg.startsWith('--')) {
          console.error(`❌ Unknown option: ${arg}`);
          showUsage();
          process.exit(1);
        }

        // Positional argument
        if (!options.csvFile) {
          options.csvFile = arg;
        } else {
          console.error(`❌ Unexpected argument: ${arg}`);
          showUsage();
          process.exit(1);
        }
    }
  }

  // Validate required arguments
  if (!options.csvFile) {
    console.error('❌ Missing required argument: csv-file');
    showUsage();
    process.exit(1);
  }

  return options;
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();

  console.log('📥 CSV Table Importer');
  console.log(`CSV File: ${options.csvFile}`);
  console.log(`Output Dir: ${options.outputDir}`);
  console.log('');

  try {
    // Check if CSV file exists
    if (!fs.existsSync(options.csvFile)) {
      console.error(`❌ CSV file not found: ${options.csvFile}`);
      process.exit(1);
    }

    // Read and validate CSV format
    console.log('📄 Reading CSV file...');
    const csvContent = fs.readFileSync(options.csvFile, 'utf8');

    const formatValidation = validateCsvFormat(csvContent);
    if (!formatValidation.valid) {
      console.error('❌ CSV format validation failed:');
      formatValidation.errors.forEach(error => console.error(`  • ${error}`));
      if (formatValidation.warnings.length > 0) {
        console.warn('⚠️  Format warnings:');
        formatValidation.warnings.forEach(warning => console.warn(`  • ${warning}`));
      }
      process.exit(1);
    }

    console.log('✅ CSV format validated');

    if (options.validateOnly) {
      console.log('\n🔍 Validation-only mode - analyzing CSV content...');

      const parseResult = parseCsvContent(csvContent);

      console.log(`\n📊 Import Analysis:`);
      console.log(`  Total rows processed: ${parseResult.metadata.totalRows}`);
      console.log(`  Valid tables found: ${parseResult.metadata.validTables}`);
      console.log(`  Skipped rows: ${parseResult.metadata.skippedRows}`);

      if (parseResult.errors.length > 0) {
        console.error('\n❌ Parse errors:');
        parseResult.errors.forEach(error => console.error(`  • ${error}`));
      }

      if (parseResult.warnings.length > 0) {
        console.warn('\n⚠️  Parse warnings:');
        parseResult.warnings.forEach(warning => console.warn(`  • ${warning}`));
      }

      console.log('\n📋 Tables that would be imported:');
      Object.keys(parseResult.tables).forEach(tableName => {
        console.log(`  • ${tableName}`);
      });

      if (options.previewChart && Object.keys(parseResult.tables).length > 0) {
        console.log('\n📊 Distribution Previews:');
        Object.entries(parseResult.tables).forEach(([tableName, table]) => {
          console.log(`\n--- ${tableName} ---`);
          console.log(createSimpleChart(table));
        });
      }

      process.exit(parseResult.errors.length > 0 ? 1 : 0);
    }

    // Parse CSV content
    console.log('🔄 Parsing CSV data...');
    const parseResult = parseCsvContent(csvContent);

    if (parseResult.errors.length > 0) {
      console.error('\n❌ Parse errors:');
      parseResult.errors.forEach(error => console.error(`  • ${error}`));
      process.exit(1);
    }

    if (parseResult.warnings.length > 0) {
      console.warn('\n⚠️  Parse warnings:');
      parseResult.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }

    console.log(`✅ Parsed ${Object.keys(parseResult.tables).length} tables`);

    // Validate tables if not skipped
    let validationResults: Record<string, ReturnType<typeof validateTableWithFeedback>> = {};

    if (!options.skipValidation) {
      console.log('\n🔍 Validating tables...');
      validationResults = {};

      for (const [tableName, table] of Object.entries(parseResult.tables)) {
        const validation = validateTableWithFeedback(table);
        validationResults[tableName] = validation;

        if (!validation.isValid) {
          console.warn(`⚠️  ${tableName}: Validation issues found (${validation.score}/100)`);
        } else {
          console.log(`✅ ${tableName}: Valid (${validation.score}/100)`);
        }
      }
    }

    if (options.dryRun) {
      console.log('\n🧪 Dry Run - Preview of what would be imported:');

      Object.entries(parseResult.tables).forEach(([tableName, table]) => {
        console.log(`\n📋 ${tableName}:`);
        console.log(`  Entries: ${Object.keys(table.entries).length}`);
        console.log(`  Offense: ${table.off_card}`);
        console.log(`  Defense: ${table.def_card}`);

        if (!options.skipValidation && validationResults[tableName]) {
          const validation = validationResults[tableName];
          console.log(`  Score: ${validation.score}/100`);

          if (validation.warnings.length > 0) {
            console.log(`  Warnings: ${validation.warnings.length}`);
          }
        }

        if (options.previewChart) {
          console.log('\n' + createSimpleChart(table));
        }
      });

      console.log(`\n📁 Would create ${Object.keys(parseResult.tables).length} files in ${options.outputDir}/`);
      return;
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // Write table files
    console.log(`\n💾 Writing ${Object.keys(parseResult.tables).length} table files...`);

    let successCount = 0;
    let errorCount = 0;

    for (const [tableName, table] of Object.entries(parseResult.tables)) {
      const outputFile = path.join(options.outputDir, `${tableName}.json`);

      try {
        // Validate before writing if not skipped
        if (!options.skipValidation) {
          const validation = validationResults[tableName];
          if (!validation || !validation.isValid) {
            console.warn(`⚠️  Skipping ${tableName} due to validation errors`);
            errorCount++;
            continue;
          }
        }

        fs.writeFileSync(outputFile, JSON.stringify(table, null, 2));
        console.log(`✅ ${tableName} → ${outputFile}`);
        successCount++;

        if (options.previewChart) {
          console.log(createSimpleChart(table));
        }
      } catch (error) {
        console.error(`❌ Failed to write ${tableName}: ${error.message}`);
        errorCount++;
      }
    }

    // Summary
    console.log(`\n📊 Import Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📁 Location: ${options.outputDir}/`);

    if (errorCount > 0) {
      console.log(`\n⚠️  ${errorCount} tables had issues and were not imported.`);
      console.log(`   Use --validate-only to see detailed error information.`);
      process.exit(1);
    } else {
      console.log('\n🎉 All tables imported successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error importing CSV:', error.message);
    process.exit(1);
  }
}

// Run the tool
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
