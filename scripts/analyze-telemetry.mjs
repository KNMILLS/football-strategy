#!/usr/bin/env node

/**
 * Telemetry Analysis Script
 * Processes NDJSON telemetry files to generate balance insights and statistics
 *
 * Usage:
 *   node scripts/analyze-telemetry.mjs --input telemetry.ndjson --output analysis.json
 *   node scripts/analyze-telemetry.mjs --input telemetry.ndjson --format table
 *   node scripts/analyze-telemetry.mjs --input telemetry.ndjson --dice-distribution
 */

import { readFileSync, writeFileSync } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { program } from 'commander';

/**
 * Telemetry event types for analysis
 */
const EVENT_TYPES = {
  DICE_ROLL: 'dice_roll',
  OUTCOME_DETERMINED: 'outcome_determined',
  PLAY_RESOLVED: 'play_resolved',
  SCORING_EVENT: 'scoring_event',
  GAME_STATE_CHANGE: 'game_state_change'
};

/**
 * Analysis results structure
 */
class TelemetryAnalysis {
  constructor() {
    this.totalEvents = 0;
    this.eventTypeCounts = {};
    this.diceRollStats = {
      totalRolls: 0,
      averageSum: 0,
      doublesCount: 0,
      doublesPercentage: 0,
      distribution: {},
      byPlayType: {},
      byDefenseType: {}
    };
    this.outcomeStats = {
      byCategory: {},
      byPlayType: {},
      byDefenseType: {},
      averageYards: 0,
      turnoverRate: 0
    };
    this.playStats = {
      totalPlays: 0,
      byPlayType: {},
      byDefenseType: {},
      averageYards: 0,
      firstDownRate: 0,
      scoringRate: 0
    };
    this.scoringStats = {
      totalScores: 0,
      byType: {},
      byTeam: { player: 0, ai: 0 },
      averagePointsPerScore: 0
    };
    this.gameFlowStats = {
      averageGameLength: 0,
      averageScore: { player: 0, ai: 0 },
      comebackRate: 0
    };
    this.sessions = new Set();
    this.games = new Set();
  }
}

/**
 * Parse command line arguments
 */
program
  .option('-i, --input <file>', 'Input NDJSON telemetry file')
  .option('-o, --output <file>', 'Output analysis file (JSON format)')
  .option('-f, --format <format>', 'Output format: json|table|csv', 'json')
  .option('--dice-distribution', 'Show dice roll distribution analysis')
  .option('--play-analysis', 'Show play effectiveness analysis')
  .option('--balance-metrics', 'Show balance and fairness metrics')
  .option('--sample-size <number>', 'Minimum sample size for statistical significance', '30')
  .parse();

const options = program.opts();

/**
 * Validate input file
 */
if (!options.input) {
  console.error('Error: Input file is required');
  console.error('Usage: node scripts/analyze-telemetry.mjs --input telemetry.ndjson');
  process.exit(1);
}

/**
 * Read and parse telemetry file line by line
 */
async function processTelemetryFile() {
  const analysis = new TelemetryAnalysis();
  let lineCount = 0;

  try {
    const fileStream = createReadStream(options.input);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      lineCount++;
      if (line.trim() === '') continue;

      try {
        const event = JSON.parse(line);
        processEvent(event, analysis);
      } catch (parseError) {
        console.warn(`Warning: Failed to parse line ${lineCount}:`, parseError.message);
      }
    }

    // Calculate derived statistics
    calculateDerivedStats(analysis);

    // Generate output based on format
    generateOutput(analysis);

  } catch (error) {
    console.error('Error processing telemetry file:', error);
    process.exit(1);
  }
}

/**
 * Process a single telemetry event
 */
function processEvent(event, analysis) {
  analysis.totalEvents++;

  // Track sessions and games
  if (event.sessionId) analysis.sessions.add(event.sessionId);
  if (event.gameId) analysis.games.add(event.gameId);

  // Process by event type
  switch (event.eventType) {
    case EVENT_TYPES.DICE_ROLL:
      processDiceRoll(event, analysis);
      break;
    case EVENT_TYPES.OUTCOME_DETERMINED:
      processOutcome(event, analysis);
      break;
    case EVENT_TYPES.PLAY_RESOLVED:
      processPlayResolution(event, analysis);
      break;
    case EVENT_TYPES.SCORING_EVENT:
      processScoring(event, analysis);
      break;
    case EVENT_TYPES.GAME_STATE_CHANGE:
      processGameStateChange(event, analysis);
      break;
  }

  // Count by event type
  analysis.eventTypeCounts[event.eventType] = (analysis.eventTypeCounts[event.eventType] || 0) + 1;
}

/**
 * Process dice roll events
 */
function processDiceRoll(event, analysis) {
  const { d1, d2, sum, isDoubles } = event.diceResult;
  const playType = event.playLabel || 'unknown';
  const defenseType = event.defenseLabel || 'unknown';

  analysis.diceRollStats.totalRolls++;

  // Overall distribution
  analysis.diceRollStats.distribution[sum] = (analysis.diceRollStats.distribution[sum] || 0) + 1;

  // Doubles tracking
  if (isDoubles) {
    analysis.diceRollStats.doublesCount++;
  }

  // By play type
  if (!analysis.diceRollStats.byPlayType[playType]) {
    analysis.diceRollStats.byPlayType[playType] = { count: 0, sums: [], doubles: 0 };
  }
  analysis.diceRollStats.byPlayType[playType].count++;
  analysis.diceRollStats.byPlayType[playType].sums.push(sum);
  if (isDoubles) {
    analysis.diceRollStats.byPlayType[playType].doubles++;
  }

  // By defense type
  if (!analysis.diceRollStats.byDefenseType[defenseType]) {
    analysis.diceRollStats.byDefenseType[defenseType] = { count: 0, sums: [], doubles: 0 };
  }
  analysis.diceRollStats.byDefenseType[defenseType].count++;
  analysis.diceRollStats.byDefenseType[defenseType].sums.push(sum);
  if (isDoubles) {
    analysis.diceRollStats.byDefenseType[defenseType].doubles++;
  }
}

/**
 * Process outcome determination events
 */
function processOutcome(event, analysis) {
  const { category, yards } = event.outcome;
  const playType = event.playLabel || 'unknown';
  const defenseType = event.defenseLabel || 'unknown';

  // By category
  analysis.outcomeStats.byCategory[category] = (analysis.outcomeStats.byCategory[category] || 0) + 1;

  // By play type
  if (!analysis.outcomeStats.byPlayType[playType]) {
    analysis.outcomeStats.byPlayType[playType] = { count: 0, totalYards: 0, turnovers: 0 };
  }
  analysis.outcomeStats.byPlayType[playType].count++;
  if (yards !== undefined) {
    analysis.outcomeStats.byPlayType[playType].totalYards += yards;
  }
  if (category === 'interception' || category === 'fumble') {
    analysis.outcomeStats.byPlayType[playType].turnovers++;
  }

  // By defense type
  if (!analysis.outcomeStats.byDefenseType[defenseType]) {
    analysis.outcomeStats.byDefenseType[defenseType] = { count: 0, totalYards: 0, turnovers: 0 };
  }
  analysis.outcomeStats.byDefenseType[defenseType].count++;
  if (yards !== undefined) {
    analysis.outcomeStats.byDefenseType[defenseType].totalYards += yards;
  }
  if (category === 'interception' || category === 'fumble') {
    analysis.outcomeStats.byDefenseType[defenseType].turnovers++;
  }

  // Turnover rate calculation
  if (category === 'interception' || category === 'fumble') {
    analysis.outcomeStats.turnoverRate++;
  }
}

/**
 * Process play resolution events
 */
function processPlayResolution(event, analysis) {
  const { category, yards, touchdown, safety, possessionChanged } = event.outcome;
  const playType = event.playLabel || 'unknown';
  const defenseType = event.defenseLabel || 'unknown';

  analysis.playStats.totalPlays++;

  // By play type
  if (!analysis.playStats.byPlayType[playType]) {
    analysis.playStats.byPlayType[playType] = {
      count: 0,
      totalYards: 0,
      firstDowns: 0,
      scores: 0,
      turnovers: 0
    };
  }
  analysis.playStats.byPlayType[playType].count++;
  if (yards !== undefined) {
    analysis.playStats.byPlayType[playType].totalYards += yards;
  }
  if (event.outcome.firstDown) {
    analysis.playStats.byPlayType[playType].firstDowns++;
  }
  if (touchdown || safety) {
    analysis.playStats.byPlayType[playType].scores++;
  }
  if (possessionChanged) {
    analysis.playStats.byPlayType[playType].turnovers++;
  }

  // By defense type
  if (!analysis.playStats.byDefenseType[defenseType]) {
    analysis.playStats.byDefenseType[defenseType] = {
      count: 0,
      totalYards: 0,
      firstDowns: 0,
      scores: 0,
      turnovers: 0
    };
  }
  analysis.playStats.byDefenseType[defenseType].count++;
  if (yards !== undefined) {
    analysis.playStats.byDefenseType[defenseType].totalYards += yards;
  }
  if (event.outcome.firstDown) {
    analysis.playStats.byDefenseType[defenseType].firstDowns++;
  }
  if (touchdown || safety) {
    analysis.playStats.byDefenseType[defenseType].scores++;
  }
  if (possessionChanged) {
    analysis.playStats.byDefenseType[defenseType].turnovers++;
  }
}

/**
 * Process scoring events
 */
function processScoring(event, analysis) {
  const { scoringTeam, points, scoreType } = event;

  analysis.scoringStats.totalScores++;
  analysis.scoringStats.byTeam[scoringTeam]++;
  analysis.scoringStats.byType[scoreType] = (analysis.scoringStats.byType[scoreType] || 0) + 1;

  // Track average points per score
  analysis.scoringStats.averagePointsPerScore += points;
}

/**
 * Process game state change events (for flow analysis)
 */
function processGameStateChange(event, analysis) {
  // Could track field position changes, time management, etc.
  // For now, just count these events
}

/**
 * Calculate derived statistics
 */
function calculateDerivedStats(analysis) {
  const sampleSize = parseInt(options.sampleSize);

  // Dice roll statistics
  if (analysis.diceRollStats.totalRolls > 0) {
    const totalRolls = analysis.diceRollStats.totalRolls;
    analysis.diceRollStats.doublesPercentage = (analysis.diceRollStats.doublesCount / totalRolls) * 100;
    analysis.diceRollStats.averageSum = Object.entries(analysis.diceRollStats.distribution)
      .reduce((sum, [value, count]) => sum + (parseInt(value) * count), 0) / totalRolls;
  }

  // Outcome statistics
  if (analysis.outcomeStats.byCategory.gain || analysis.outcomeStats.byCategory.loss) {
    const totalOutcomes = Object.values(analysis.outcomeStats.byCategory)
      .reduce((sum, count) => sum + count, 0);
    analysis.outcomeStats.turnoverRate = (analysis.outcomeStats.turnoverRate / totalOutcomes) * 100;
  }

  // Play statistics
  if (analysis.playStats.totalPlays > 0) {
    analysis.playStats.firstDownRate = Object.values(analysis.playStats.byPlayType)
      .reduce((sum, play) => sum + (play.firstDowns / play.count), 0) / Object.keys(analysis.playStats.byPlayType).length * 100;

    analysis.playStats.scoringRate = Object.values(analysis.playStats.byPlayType)
      .reduce((sum, play) => sum + (play.scores / play.count), 0) / Object.keys(analysis.playStats.byPlayType).length * 100;
  }

  // Scoring statistics
  if (analysis.scoringStats.totalScores > 0) {
    analysis.scoringStats.averagePointsPerScore /= analysis.scoringStats.totalScores;
  }

  // Game flow statistics (would need more game-level data for accurate calculations)
  analysis.gameFlowStats.averageScore = {
    player: analysis.scoringStats.byTeam.player * 6 / Math.max(1, analysis.games.size), // Rough estimate
    ai: analysis.scoringStats.byTeam.ai * 6 / Math.max(1, analysis.games.size)
  };
}

/**
 * Generate output based on selected format and options
 */
function generateOutput(analysis) {
  const output = {
    summary: {
      totalEvents: analysis.totalEvents,
      sessions: analysis.sessions.size,
      games: analysis.games.size,
      eventTypeBreakdown: analysis.eventTypeCounts
    },
    diceAnalysis: generateDiceAnalysis(analysis),
    outcomeAnalysis: generateOutcomeAnalysis(analysis),
    playAnalysis: generatePlayAnalysis(analysis),
    scoringAnalysis: generateScoringAnalysis(analysis),
    balanceMetrics: generateBalanceMetrics(analysis)
  };

  switch (options.format) {
    case 'json':
      const jsonOutput = JSON.stringify(output, null, 2);
      if (options.output) {
        writeFileSync(options.output, jsonOutput);
        console.log(`Analysis saved to ${options.output}`);
      } else {
        console.log(jsonOutput);
      }
      break;

    case 'table':
      printTableOutput(output);
      break;

    case 'csv':
      printCsvOutput(output);
      break;

    default:
      console.log(JSON.stringify(output, null, 2));
  }
}

/**
 * Generate dice roll analysis
 */
function generateDiceAnalysis(analysis) {
  if (!options.diceDistribution && !analysis.diceRollStats.totalRolls) {
    return null;
  }

  return {
    totalRolls: analysis.diceRollStats.totalRolls,
    averageSum: Math.round(analysis.diceRollStats.averageSum * 100) / 100,
    doublesRate: Math.round(analysis.diceRollStats.doublesPercentage * 100) / 100,
    distribution: analysis.diceRollStats.distribution,
    statisticalSignificance: analysis.diceRollStats.totalRolls >= parseInt(options.sampleSize) ? 'sufficient' : 'insufficient'
  };
}

/**
 * Generate outcome analysis
 */
function generateOutcomeAnalysis(analysis) {
  return {
    byCategory: analysis.outcomeStats.byCategory,
    turnoverRate: Math.round(analysis.outcomeStats.turnoverRate * 100) / 100,
    averageYards: analysis.outcomeStats.averageYards
  };
}

/**
 * Generate play effectiveness analysis
 */
function generatePlayAnalysis(analysis) {
  if (!options.playAnalysis) return null;

  return {
    totalPlays: analysis.playStats.totalPlays,
    firstDownRate: Math.round(analysis.playStats.firstDownRate * 100) / 100,
    scoringRate: Math.round(analysis.playStats.scoringRate * 100) / 100,
    byPlayType: analysis.playStats.byPlayType,
    byDefenseType: analysis.playStats.byDefenseType
  };
}

/**
 * Generate scoring analysis
 */
function generateScoringAnalysis(analysis) {
  return {
    totalScores: analysis.scoringStats.totalScores,
    byTeam: analysis.scoringStats.byTeam,
    byType: analysis.scoringStats.byType,
    averagePointsPerScore: Math.round(analysis.scoringStats.averagePointsPerScore * 100) / 100
  };
}

/**
 * Generate balance and fairness metrics
 */
function generateBalanceMetrics(analysis) {
  if (!options.balanceMetrics) return null;

  const playerScores = analysis.scoringStats.byTeam.player || 0;
  const aiScores = analysis.scoringStats.byTeam.ai || 0;
  const totalScores = playerScores + aiScores;

  return {
    scoreBalance: {
      playerPercentage: totalScores > 0 ? Math.round((playerScores / totalScores) * 100) : 50,
      aiPercentage: totalScores > 0 ? Math.round((aiScores / totalScores) * 100) : 50,
      isBalanced: Math.abs(playerScores - aiScores) / Math.max(totalScores, 1) < 0.2
    },
    sampleSize: {
      games: analysis.games.size,
      isStatisticallySignificant: analysis.games.size >= parseInt(options.sampleSize)
    }
  };
}

/**
 * Print table format output
 */
function printTableOutput(output) {
  console.log('\n=== TELEMETRY ANALYSIS SUMMARY ===');
  console.log(`Total Events: ${output.summary.totalEvents}`);
  console.log(`Sessions: ${output.summary.sessions}`);
  console.log(`Games: ${output.summary.games}`);

  if (output.diceAnalysis) {
    console.log('\n=== DICE ROLL ANALYSIS ===');
    console.log(`Total Rolls: ${output.diceAnalysis.totalRolls}`);
    console.log(`Average Sum: ${output.diceAnalysis.averageSum}`);
    console.log(`Doubles Rate: ${output.diceAnalysis.doublesRate}%`);
  }

  if (output.scoringAnalysis) {
    console.log('\n=== SCORING ANALYSIS ===');
    console.log(`Total Scores: ${output.scoringAnalysis.totalScores}`);
    console.log(`Player Scores: ${output.scoringAnalysis.byTeam.player}`);
    console.log(`AI Scores: ${output.scoringAnalysis.byTeam.ai}`);
  }
}

/**
 * Print CSV format output
 */
function printCsvOutput(output) {
  console.log('EventType,Count');
  Object.entries(output.summary.eventTypeBreakdown).forEach(([type, count]) => {
    console.log(`${type},${count}`);
  });

  if (output.diceAnalysis) {
    console.log('\nDiceValue,Count');
    Object.entries(output.diceAnalysis.distribution).forEach(([value, count]) => {
      console.log(`${value},${count}`);
    });
  }
}

/**
 * Run the analysis
 */
processTelemetryFile().catch(console.error);
