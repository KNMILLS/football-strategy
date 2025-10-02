#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeDistribution } from '../src/tools/table-authoring/DistributionPreview.js';
import { validateTableWithFeedback, formatValidationOutput } from '../src/tools/table-authoring/ValidationFeedback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI tool for previewing dice table distributions and balance analysis
 *
 * Usage: node scripts/preview-distribution.mjs <table-file> [options]
 */

const USAGE = `
📊 Distribution Preview - Analyze table balance and visualize distributions

Usage:
  node scripts/preview-distribution.mjs <table-file> [options]

Arguments:
  table-file      Path to JSON table file to analyze

Options:
  --bin-size <n>      Histogram bin size in yards (default: 5)
  --no-histogram      Don't show ASCII histogram
  --balance-only      Show only balance analysis, no distribution
  --compare <file>    Compare with another table file
  --output <format>   Output format: text, json (default: text)
  --validate          Include detailed validation feedback

Examples:
  node scripts/preview-distribution.mjs data/west_coast_blitz.json
  node scripts/preview-distribution.mjs my_table.json --bin-size 10 --validate
  node scripts/preview-distribution.mjs table1.json --compare table2.json
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
    tableFile: null,
    binSize: 5,
    showHistogram: true,
    balanceOnly: false,
    compareFile: null,
    outputFormat: 'text',
    includeValidation: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--bin-size':
        options.binSize = parseInt(args[++i]);
        if (isNaN(options.binSize) || options.binSize < 1) {
          console.error(`❌ Invalid bin size: ${args[i]} (must be positive number)`);
          process.exit(1);
        }
        break;

      case '--no-histogram':
        options.showHistogram = false;
        break;

      case '--balance-only':
        options.balanceOnly = true;
        break;

      case '--compare':
        options.compareFile = args[++i];
        break;

      case '--output':
        options.outputFormat = args[++i];
        if (!['text', 'json'].includes(options.outputFormat)) {
          console.error(`❌ Invalid output format: ${options.outputFormat}`);
          showUsage();
          process.exit(1);
        }
        break;

      case '--validate':
        options.includeValidation = true;
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
        if (!options.tableFile) {
          options.tableFile = arg;
        } else {
          console.error(`❌ Unexpected argument: ${arg}`);
          showUsage();
          process.exit(1);
        }
    }
  }

  // Validate required arguments
  if (!options.tableFile) {
    console.error('❌ Missing required argument: table-file');
    showUsage();
    process.exit(1);
  }

  return options;
}

/**
 * Loads a table from file
 */
function loadTable(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load table from ${filePath}: ${error.message}`);
  }
}

/**
 * Formats analysis results as text output
 */
function formatTextOutput(table, analysis, validation = null) {
  let output = '';

  output += `📊 Distribution Analysis: ${table.off_card} vs ${table.def_card}\n`;
  output += `═══════════════════════════════════════════════════════\n\n`;

  if (!analysis.balance.guardrailViolations.length) {
    output += '✅ Balance Check: PASSED\n';
  } else {
    output += `⚠️  Balance Issues: ${analysis.balance.guardrailViolations.length}\n`;
  }

  output += `\n📈 Statistics:\n`;
  output += `  • Mean: ${analysis.statistics.mean.toFixed(1)} yards\n`;
  output += `  • Median: ${analysis.statistics.median.toFixed(1)} yards\n`;
  output += `  • Std Dev: ${analysis.statistics.stdDev.toFixed(1)} yards\n`;
  output += `  • Range: ${analysis.statistics.min}-${analysis.statistics.max} yards\n`;
  output += `  • Explosive Rate: ${analysis.statistics.explosiveRate.toFixed(1)}%\n`;
  output += `  • Turnover Rate: ${analysis.statistics.turnoverRate.toFixed(1)}%\n`;

  output += `\n⏰ Clock Distribution:\n`;
  Object.entries(analysis.statistics.clockDistribution).forEach(([clock, pct]) => {
    output += `  • ${clock}s: ${pct.toFixed(1)}%\n`;
  });

  if (analysis.balance.guardrailViolations.length > 0) {
    output += `\n⚠️  Guardrail Violations:\n`;
    analysis.balance.guardrailViolations.forEach(violation => {
      output += `  • ${violation}\n`;
    });
  }

  if (analysis.balance.playbookIdentity) {
    if (analysis.balance.playbookIdentity.matches.length > 0) {
      output += `\n✅ Playbook Identity:\n`;
      analysis.balance.playbookIdentity.matches.forEach(match => {
        output += `  • ${match}\n`;
      });
    }

    if (analysis.balance.playbookIdentity.suggestions.length > 0) {
      output += `\n💡 Playbook Suggestions:\n`;
      analysis.balance.playbookIdentity.suggestions.forEach(suggestion => {
        output += `  • ${suggestion}\n`;
      });
    }
  }

  if (validation) {
    output += `\n🔍 Validation Results (${validation.score}/100):\n`;
    if (validation.errors.length > 0) {
      output += `❌ Errors: ${validation.errors.length}\n`;
      validation.errors.forEach(error => {
        output += `  • ${error.message}\n`;
      });
    }
    if (validation.warnings.length > 0) {
      output += `⚠️  Warnings: ${validation.warnings.length}\n`;
      validation.warnings.forEach(warning => {
        output += `  • ${warning.message}\n`;
      });
    }
  }

  return output;
}

/**
 * Formats analysis results as JSON output
 */
function formatJsonOutput(table, analysis, validation = null) {
  const output = {
    table: {
      name: `${table.off_card}_${table.def_card}`,
      offense: table.off_card,
      defense: table.def_card,
      entries: Object.keys(table.entries).length,
      meta: table.meta
    },
    statistics: analysis.statistics,
    balance: analysis.balance,
    bins: analysis.bins
  };

  if (validation) {
    output.validation = {
      score: validation.score,
      isValid: validation.isValid,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      suggestions: validation.suggestions.length
    };
  }

  return JSON.stringify(output, null, 2);
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();

  console.log('📊 Distribution Preview Tool');
  console.log(`Table: ${options.tableFile}`);
  if (options.binSize !== 5) console.log(`Bin Size: ${options.binSize} yards`);
  console.log('');

  try {
    // Load primary table
    const table = loadTable(options.tableFile);

    // Perform analysis
    const analysis = analyzeDistribution(table, {
      binSize: options.binSize,
      showAsciiHistogram: options.showHistogram,
      analyzeBalance: true,
      detectPlaybookIdentity: true
    });

    // Include validation if requested
    let validation = null;
    if (options.includeValidation) {
      validation = validateTableWithFeedback(table);
    }

    // Handle comparison mode
    if (options.compareFile) {
      console.log('🔄 Comparison Mode');
      const compareTable = loadTable(options.compareFile);
      const compareAnalysis = analyzeDistribution(compareTable, {
        binSize: options.binSize,
        showAsciiHistogram: false,
        analyzeBalance: true,
        detectPlaybookIdentity: true
      });

      // Show comparison
      console.log(`\n📋 ${table.off_card} vs ${table.def_card} vs ${compareTable.off_card} vs ${compareTable.def_card}`);
      console.log(`─────────────────────────────────────────────────────────────────`);

      console.log(`\n📈 ${table.off_card}: ${analysis.statistics.mean.toFixed(1)} avg yards, ${analysis.statistics.explosiveRate.toFixed(1)}% explosive`);
      console.log(`📈 ${compareTable.off_card}: ${compareAnalysis.statistics.mean.toFixed(1)} avg yards, ${compareAnalysis.statistics.explosiveRate.toFixed(1)}% explosive`);

      if (analysis.balance.guardrailViolations.length === 0 && compareAnalysis.balance.guardrailViolations.length === 0) {
        console.log(`\n✅ Both tables pass balance checks`);
      } else {
        if (analysis.balance.guardrailViolations.length > 0) {
          console.log(`\n⚠️  ${table.off_card} violations: ${analysis.balance.guardrailViolations.length}`);
        }
        if (compareAnalysis.balance.guardrailViolations.length > 0) {
          console.log(`\n⚠️  ${compareTable.off_card} violations: ${compareAnalysis.balance.guardrailViolations.length}`);
        }
      }

      process.exit(0);
    }

    // Handle balance-only mode
    if (options.balanceOnly) {
      console.log('⚖️  Balance Analysis Only');
      console.log(`═══════════════════════════════════════════════`);

      if (analysis.balance.guardrailViolations.length === 0) {
        console.log(`\n✅ All balance guardrails PASSED`);
      } else {
        console.log(`\n⚠️  Guardrail Violations (${analysis.balance.guardrailViolations.length}):`);
        analysis.balance.guardrailViolations.forEach(violation => {
          console.log(`  • ${violation}`);
        });
      }

      if (analysis.balance.playbookIdentity) {
        if (analysis.balance.playbookIdentity.matches.length > 0) {
          console.log(`\n✅ Playbook Identity Match:`);
          analysis.balance.playbookIdentity.matches.forEach(match => {
            console.log(`  • ${match}`);
          });
        }

        if (analysis.balance.playbookIdentity.suggestions.length > 0) {
          console.log(`\n💡 Playbook Suggestions:`);
          analysis.balance.playbookIdentity.suggestions.forEach(suggestion => {
            console.log(`  • ${suggestion}`);
          });
        }
      }

      console.log(`\n🎯 Risk Assessment: ${analysis.balance.riskAssessment.toUpperCase()}`);
      process.exit(0);
    }

    // Show ASCII histogram if requested
    if (options.showHistogram) {
      console.log(analysis.visualization.asciiHistogram);
    }

    // Format and display output
    if (options.outputFormat === 'json') {
      console.log(formatJsonOutput(table, analysis, validation));
    } else {
      console.log(formatTextOutput(table, analysis, validation));
    }

  } catch (error) {
    console.error('\n❌ Error analyzing distribution:', error.message);

    if (error.message.includes('File not found')) {
      console.error('\n💡 Make sure the table file exists and the path is correct.');
    } else if (error.message.includes('JSON')) {
      console.error('\n💡 Make sure the file contains valid JSON.');
    }

    process.exit(1);
  }
}

// Run the tool
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
