#!/usr/bin/env node

/**
 * playtest-balance.mjs - Automated balance analysis for dice table distributions
 *
 * Main entry point for the comprehensive balance analysis system.
 * Runs statistical analysis, guardrail compliance checking, outlier detection,
 * and generates detailed balance reports.
 */

import { SimulationRunner } from '../src/sim/balance/SimulationRunner.ts';
import { OutlierDetector } from '../src/sim/balance/OutlierDetector.ts';
import { ReportGenerator } from '../src/sim/balance/ReportGenerator.ts';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Command-line interface for balance analysis
 */
async function main() {
  console.log('🏈 Gridiron Strategy - Balance Analysis Tool');
  console.log('============================================\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = parseArguments(args);

  if (options.help) {
    showHelp();
    return;
  }

  try {
    // Initialize analysis components
    console.log('Initializing balance analysis system...\n');

    const config = SimulationRunner.createDefaultConfig();
    if (options.sampleSize) config.sampleSize = options.sampleSize;
    if (options.seed) config.seed = options.seed;
    if (options.concurrency) config.maxConcurrency = options.concurrency;

    const runner = new SimulationRunner(config);
    const outlierDetector = new OutlierDetector();
    const reportGenerator = new ReportGenerator();

    // Discover available tables
    console.log('Discovering dice tables...');
    const tables = await SimulationRunner.discoverTables();
    console.log(`Found ${tables.length} tables across ${new Set(tables.map(t => t.playbook)).size} playbooks\n`);

    if (tables.length === 0) {
      console.error('❌ No tables found. Please check data/tables_v1/ directory structure.');
      process.exit(1);
    }

    // Set up progress tracking
    if (options.verbose) {
      runner.setProgressCallback((progress) => {
        const percent = ((progress.completed / progress.total) * 100).toFixed(1);
        const eta = progress.estimatedTimeRemaining
          ? `${(progress.estimatedTimeRemaining / 1000).toFixed(0)}s`
          : 'calculating...';

        process.stdout.write(`\rProgress: ${percent}% (${progress.completed}/${progress.total}) - ETA: ${eta}`);

        if (progress.current) {
          process.stdout.write(` - Analyzing: ${progress.current}`);
        }
      });
    }

    // Run the analysis
    console.log(`Starting analysis with sample size ${config.sampleSize.toLocaleString()}...`);
    const startTime = performance.now();

    const result = await runner.runAnalysis(tables);

    const endTime = performance.now();
    console.log(`\n\n✅ Analysis complete in ${(endTime - startTime) / 1000}s`);

    // Detect outliers
    console.log('Detecting statistical outliers...');
    const outliers = outlierDetector.detectOutliers(result.analyses);

    // Generate comprehensive report
    console.log('Generating balance report...');
    const report = reportGenerator.generateReport(
      result.analyses,
      result.compliance,
      outliers,
      result.duration,
      { sampleSize: config.sampleSize, seed: config.seed }
    );

    // Output results
    await outputResults(report, options);

    // Show summary
    showSummary(report);

    // Exit with appropriate code based on results
    const hasCriticalIssues = report.summary.criticalTables > 0 || report.outliers.summary.criticalOutliers > 0;
    const hasHighIssues = report.summary.tablesWithViolations > report.summary.totalTables * 0.3;

    if (hasCriticalIssues) {
      console.log('\n❌ Critical balance issues detected. Review report for details.');
      process.exit(2);
    } else if (hasHighIssues) {
      console.log('\n⚠️  Significant balance issues detected. Review recommendations.');
      process.exit(1);
    } else {
      console.log('\n✅ Balance analysis complete. System appears well-balanced.');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

/**
 * Parses command line arguments
 */
function parseArguments(args) {
  const options = {
    help: false,
    verbose: false,
    output: 'report',
    format: 'text',
    sampleSize: 10000,
    seed: 12345,
    concurrency: 4
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i] || 'report';
        break;
      case '--format':
      case '-f':
        options.format = args[++i] || 'text';
        break;
      case '--sample-size':
      case '-s':
        options.sampleSize = parseInt(args[++i]) || 10000;
        break;
      case '--seed':
        options.seed = parseInt(args[++i]) || 12345;
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(args[++i]) || 4;
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Shows help information
 */
function showHelp() {
  console.log(`
Gridiron Strategy Balance Analysis Tool

Usage: node scripts/playtest-balance.mjs [options]

Options:
  -h, --help              Show this help message
  -v, --verbose           Enable verbose progress output
  -o, --output FILE       Output file (default: balance-report.json/txt)
  -f, --format FORMAT     Output format: text, json (default: text)
  -s, --sample-size N     Sample size per table (default: 10000)
  --seed N                Random seed for reproducible results (default: 12345)
  -c, --concurrency N     Max concurrent analyses (default: 4)

Examples:
  node scripts/playtest-balance.mjs
  node scripts/playtest-balance.mjs --verbose --sample-size 50000
  node scripts/playtest-balance.mjs --format json --output custom-report.json

The tool analyzes all dice tables in data/tables_v1/ against GDD guardrails
and generates comprehensive balance reports with recommendations.
  `);
}

/**
 * Outputs results based on format and options
 */
async function outputResults(report, options) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const defaultFilename = `balance-report-${timestamp}`;

  let filename = options.output;
  if (filename === 'report') {
    filename = defaultFilename;
  }

  if (options.format === 'json') {
    const jsonReport = reportGenerator.exportToJSON(report);
    const jsonFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    writeFileSync(jsonFilename, jsonReport);
    console.log(`📄 JSON report saved to: ${jsonFilename}`);
  } else {
    const textReport = reportGenerator.exportToText(report);
    const txtFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    writeFileSync(txtFilename, textReport);
    console.log(`📄 Text report saved to: ${txtFilename}`);
  }
}

/**
 * Shows analysis summary to console
 */
function showSummary(report) {
  console.log('\n📊 Analysis Summary');
  console.log('==================');

  console.log(`Overall Health: ${report.summary.overallHealth.toUpperCase()}`);
  console.log(`Compliance Score: ${report.summary.complianceScore.toFixed(1)}/100`);

  console.log(`\nBreakdown:`);
  console.log(`  Compliant: ${report.summary.compliantTables} tables`);
  console.log(`  Warnings:  ${report.summary.tablesWithWarnings} tables`);
  console.log(`  Violations: ${report.summary.tablesWithViolations} tables`);
  console.log(`  Critical:  ${report.summary.criticalTables} tables`);

  if (report.outliers.summary.tablesWithOutliers > 0) {
    console.log(`\nOutliers:`);
    console.log(`  Tables with outliers: ${report.outliers.summary.tablesWithOutliers}`);
    console.log(`  Critical outliers: ${report.outliers.summary.criticalOutliers}`);
    console.log(`  High severity: ${report.outliers.summary.highSeverityOutliers}`);
  }

  if (report.recommendations.priority.length > 0) {
    console.log(`\nPriority Actions:`);
    report.recommendations.priority.slice(0, 3).forEach((rec, i) => {
      console.log(`  ${i + 1}. [${rec.level.toUpperCase()}] ${rec.category}`);
    });
  }
}

// Run the analysis if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
