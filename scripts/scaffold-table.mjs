#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scaffoldMatchupTable, suggestTableName, validateTableName } from '../src/tools/table-authoring/TableScaffolder.js';
import { validateTableWithFeedback, formatValidationOutput } from '../src/tools/table-authoring/ValidationFeedback.js';
import { createSimpleChart } from '../src/tools/table-authoring/DistributionPreview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI tool for scaffolding new dice tables with GDD-compliant structure
 *
 * Usage: node scripts/scaffold-table.mjs <offense-card> <defense-card> [options]
 */

const USAGE = `
📋 Table Scaffolder - Create new dice tables with proper structure

Usage:
  node scripts/scaffold-table.mjs <offense-card> <defense-card> [options]

Arguments:
  offense-card    Name of the offense card (e.g., "West Coast", "Air Raid")
  defense-card    Name of the defense card (e.g., "Blitz", "Coverage")

Options:
  --template <type>     Template type: conservative, aggressive, balanced (default: balanced)
  --risk <level>        Risk profile: low, medium, high (default: medium)
  --explosive <sum>     Explosive start sum: 20-39 (default: 22)
  --output <file>       Output file path (default: data/<suggested-name>.json)
  --dry-run            Show preview without creating file
  --validate-only      Only validate, don't create table
  --preview-chart      Show distribution preview chart

Examples:
  node scripts/scaffold-table.mjs "West Coast" "Blitz"
  node scripts/scaffold-table.mjs "Air Raid" "Coverage" --template aggressive --risk high
  node scripts/scaffold-table.mjs "Smashmouth" "Rush" --explosive 20 --preview-chart
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
    offenseCard: null,
    defenseCard: null,
    template: 'balanced',
    riskProfile: 'medium',
    explosiveStartSum: 22,
    outputFile: null,
    dryRun: false,
    validateOnly: false,
    previewChart: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--template':
        options.template = args[++i];
        if (!['conservative', 'aggressive', 'balanced'].includes(options.template)) {
          console.error(`❌ Invalid template: ${options.template}`);
          showUsage();
          process.exit(1);
        }
        break;

      case '--risk':
        options.riskProfile = args[++i];
        if (!['low', 'medium', 'high'].includes(options.riskProfile)) {
          console.error(`❌ Invalid risk profile: ${options.riskProfile}`);
          showUsage();
          process.exit(1);
        }
        break;

      case '--explosive':
        options.explosiveStartSum = parseInt(args[++i]);
        if (isNaN(options.explosiveStartSum) || options.explosiveStartSum < 20 || options.explosiveStartSum > 39) {
          console.error(`❌ Invalid explosive start sum: ${args[i]} (must be 20-39)`);
          process.exit(1);
        }
        break;

      case '--output':
        options.outputFile = args[++i];
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--validate-only':
        options.validateOnly = true;
        break;

      case '--preview-chart':
        options.previewChart = true;
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

        // Positional arguments
        if (!options.offenseCard) {
          options.offenseCard = arg;
        } else if (!options.defenseCard) {
          options.defenseCard = arg;
        } else {
          console.error(`❌ Unexpected argument: ${arg}`);
          showUsage();
          process.exit(1);
        }
    }
  }

  // Validate required arguments
  if (!options.offenseCard || !options.defenseCard) {
    console.error('❌ Missing required arguments: offense-card and defense-card');
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

  console.log('🏗️  Table Scaffolder');
  console.log(`Offense: ${options.offenseCard}`);
  console.log(`Defense: ${options.defenseCard}`);
  console.log('');

  try {
    // Generate suggested table name
    const suggestedName = suggestTableName(options.offenseCard, options.defenseCard);
    const tableNameValidation = validateTableName(suggestedName);

    if (!tableNameValidation.valid) {
      console.warn(`⚠️  Suggested name "${suggestedName}" is invalid: ${tableNameValidation.error}`);
    }

    // Determine output file
    const outputFile = options.outputFile || `data/${suggestedName}.json`;

    if (options.validateOnly) {
      console.log('🔍 Validation Mode - checking existing table...');
      if (!fs.existsSync(outputFile)) {
        console.error(`❌ File not found: ${outputFile}`);
        process.exit(1);
      }

      const existingContent = fs.readFileSync(outputFile, 'utf8');
      const existingTable = JSON.parse(existingContent);

      const validation = validateTableWithFeedback(existingTable);
      console.log(formatValidationOutput(validation));

      if (options.previewChart) {
        console.log(createSimpleChart(existingTable));
      }

      process.exit(validation.isValid ? 0 : 1);
    }

    // Scaffold the table
    console.log('🔧 Scaffolding table...');
    const scaffoldResult = scaffoldMatchupTable({
      offCard: options.offenseCard,
      defCard: options.defenseCard,
      template: options.template,
      riskProfile: options.riskProfile,
      explosiveStartSum: options.explosiveStartSum,
      oobBias: options.template === 'aggressive',
      fieldPosClamp: options.template !== 'aggressive'
    });

    const { table, warnings, suggestions } = scaffoldResult;

    // Show warnings and suggestions
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
    }

    // Validate the generated table
    const validation = validateTableWithFeedback(table);
    console.log(`\n📊 Validation Score: ${validation.score}/100`);

    if (!validation.isValid) {
      console.log('\n❌ Table has validation errors:');
      console.log(formatValidationOutput(validation));
      process.exit(1);
    }

    if (options.dryRun) {
      console.log('\n🧪 Dry Run - Preview:');
      console.log(`Output file would be: ${outputFile}`);
      console.log('\n📋 Table Preview:');
      console.log(JSON.stringify(table, null, 2));

      if (options.previewChart) {
        console.log('\n' + createSimpleChart(table));
      }

      console.log('\n✅ Preview complete - use without --dry-run to create file');
      return;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the table file
    fs.writeFileSync(outputFile, JSON.stringify(table, null, 2));

    console.log(`\n✅ Table scaffolded successfully!`);
    console.log(`📁 File: ${outputFile}`);
    console.log(`🔢 Entries: ${Object.keys(table.entries).length}`);
    console.log(`⚙️  Template: ${options.template}`);
    console.log(`🎯 Risk: ${options.riskProfile}`);

    if (options.previewChart) {
      console.log('\n' + createSimpleChart(table));
    }

    console.log(`\n🎉 Ready for customization! Edit ${outputFile} to adjust yardage, clock, and turnover values.`);

  } catch (error) {
    console.error('\n❌ Error scaffolding table:', error.message);
    process.exit(1);
  }
}

// Run the tool
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
