#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLCG } from '../src/sim/RNG.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load matchup table from fixtures
 */
function loadMatchupTable(offCardId, defCardId) {
  // Use absolute paths from the project root
  const projectRoot = 'C:/Gridiron-TS/Gridiron/gridiron_full_game';
  const possiblePaths = [
    path.join(projectRoot, 'data', 'tables_v1', offCardId + '__' + defCardId + '.json'),
    path.join(projectRoot, 'fixtures', 'tables_v1', offCardId + '__' + defCardId + '.json'),
    path.join(projectRoot, 'data', 'tables_v1', 'west_coast', offCardId + '__' + defCardId + '.json'),
    path.join(projectRoot, 'data', 'tables_v1', 'spread', offCardId + '__' + defCardId + '.json'),
    path.join(projectRoot, 'data', 'tables_v1', 'air_raid', offCardId + '__' + defCardId + '.json'),
    path.join(projectRoot, 'data', 'tables_v1', 'smashmouth', offCardId + '__' + defCardId + '.json'),
    path.join(projectRoot, 'data', 'tables_v1', 'wide_zone', offCardId + '__' + defCardId + '.json'),
    // Try case-insensitive matches
    path.join(projectRoot, 'data', 'tables_v1', 'air_raid', offCardId + '__' + defCardId.toLowerCase() + '.json'),
    path.join(projectRoot, 'data', 'tables_v1', 'air_raid', offCardId + '__def-' + defCardId.toLowerCase().replace('def_', '').replace('DEF_', '') + '.json')
  ];

  for (const tablePath of possiblePaths) {
    try {
      if (fs.existsSync(tablePath)) {
        const content = fs.readFileSync(tablePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      // Continue to next path
    }
  }

  throw new Error(`Failed to load matchup table ${offCardId}__${defCardId}: not found in any expected location`);
}

/**
 * Load penalty table
 */
function loadPenaltyTable() {
  const tablePath = path.join(__dirname, '..', 'src', 'data', 'penalties', 'penalty_table_v1.json');

  try {
    const content = fs.readFileSync(tablePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load penalty table: ${error.message}`);
  }
}

/**
 * Simulate dice roll using LCG RNG
 */
function simulateResolve(offCardId, defCardId, matchupTable, penaltyTable, rng) {
  const die1 = Math.floor(rng() * 20) + 1;
  const die2 = Math.floor(rng() * 20) + 1;
  const sum = die1 + die2;

  // Check for doubles
  if (die1 === die2) {
    if (sum === 2) { // 1-1
      return { result: 'DEF_TD', yards: 0 };
    } else if (sum === 40) { // 20-20
      return { result: 'OFF_TD', yards: 0 };
    } else { // 2-19 doubles
      const penaltyRoll = Math.floor(rng() * 10) + 1;
      const penaltyOutcome = penaltyTable.entries[penaltyRoll.toString()];

      if (penaltyOutcome.override_play_result) {
        return {
          result: 'PENALTY_OVERRIDE',
          penalty: penaltyOutcome,
          yards: penaltyOutcome.yards || 0
        };
      } else {
        // Get base result and combine with penalty
        const baseEntry = matchupTable.entries[sum.toString()];
        return {
          result: 'PENALTY_WITH_BASE',
          base: baseEntry,
          penalty: penaltyOutcome,
          yards: baseEntry?.yards || 0
        };
      }
    }
  } else {
    // Normal 2d20 lookup
    const entry = matchupTable.entries[sum.toString()];
    if (!entry) {
      throw new Error(`No entry found for dice sum ${sum}`);
    }

    return {
      result: 'NORMAL',
      yards: entry.yards || 0,
      turnover: entry.turnover,
      oob: entry.oob,
      clock: entry.clock
    };
  }
}

/**
 * Run simulation and collect statistics
 */
function runSimulation(offCardId, defCardId, rolls = 100000) {
  console.log(`🎲 Running simulation: ${offCardId} vs ${defCardId} (${rolls.toLocaleString()} rolls)`);

  const matchupTable = loadMatchupTable(offCardId, defCardId);
  const penaltyTable = loadPenaltyTable();

  const results = {
    totalRolls: rolls,
    outcomes: {
      DEF_TD: 0,
      OFF_TD: 0,
      PENALTY_OVERRIDE: 0,
      PENALTY_WITH_BASE: 0,
      NORMAL: 0
    },
    yardage: {
      total: 0,
      buckets: {
        '≤ -10': 0,
        '-9 to -4': 0,
        '-3 to 0': 0,
        '1 to 4': 0,
        '5 to 9': 0,
        '10 to 19': 0,
        '≥ 20': 0
      },
      turnovers: 0,
      oob: 0
    }
  };

  const rng = createLCG(12345); // Fixed seed for reproducible results

  for (let i = 0; i < rolls; i++) {
    const result = simulateResolve(offCardId, defCardId, matchupTable, penaltyTable, rng);

    // Count outcomes
    if (result.result) {
      results.outcomes[result.result]++;
    }

    // Collect yardage data
    if (result.yards !== undefined) {
      results.yardage.total += result.yards;

      if (result.yards <= -10) {
        results.yardage.buckets['≤ -10']++;
      } else if (result.yards >= -9 && result.yards <= -4) {
        results.yardage.buckets['-9 to -4']++;
      } else if (result.yards >= -3 && result.yards <= 0) {
        results.yardage.buckets['-3 to 0']++;
      } else if (result.yards >= 1 && result.yards <= 4) {
        results.yardage.buckets['1 to 4']++;
      } else if (result.yards >= 5 && result.yards <= 9) {
        results.yardage.buckets['5 to 9']++;
      } else if (result.yards >= 10 && result.yards <= 19) {
        results.yardage.buckets['10 to 19']++;
      } else if (result.yards >= 20) {
        results.yardage.buckets['≥ 20']++;
      }
    }

    // Count turnovers
    if (result.turnover) {
      results.yardage.turnovers++;
    }

    // Count OOB
    if (result.oob) {
      results.yardage.oob++;
    }
  }

  return results;
}

/**
 * Print simulation results in a nice format
 */
function printResults(results) {
  console.log('\n📊 Simulation Results');
  console.log('=' .repeat(50));

  // Outcome percentages
  console.log('\n🎯 Outcome Distribution:');
  Object.entries(results.outcomes).forEach(([outcome, count]) => {
    const percentage = ((count / results.totalRolls) * 100).toFixed(2);
    console.log(`  ${outcome}: ${count.toLocaleString()} (${percentage}%)`);
  });

  // Yardage statistics
  const avgYards = (results.yardage.total / results.totalRolls).toFixed(2);

  console.log('\n📏 Yardage Statistics:');
  console.log(`  Average yards: ${avgYards}`);
  console.log(`  Turnovers: ${results.yardage.turnovers} (${((results.yardage.turnovers / results.totalRolls) * 100).toFixed(2)}%)`);
  console.log(`  Out of bounds: ${results.yardage.oob} (${((results.yardage.oob / results.totalRolls) * 100).toFixed(2)}%)`);

  console.log('\n📈 Yardage Distribution:');
  Object.entries(results.yardage.buckets).forEach(([bucket, count]) => {
    const percentage = ((count / results.totalRolls) * 100).toFixed(2);
    console.log(`  ${bucket}: ${count.toLocaleString()} (${percentage}%)`);
  });

  console.log('\n' + '=' .repeat(50));
}

/**
 * Main function
 */
function main() {
  console.log('Starting simulation script...');
  const args = process.argv.slice(2);
  console.log('Arguments:', args);

  if (args.length < 2) {
    console.error('Usage: npm run sim:matchup <offCardId> <defCardId> [--rolls N]');
    console.error('Example: npm run sim:matchup AIRRAID_PA_DEEP_SHOT DEF_INSIDE_BLITZ --rolls 100000');
    process.exit(1);
  }

  const offCardId = args[0];
  const defCardId = args[1];
  let rolls = 100000; // Default

  console.log(`Parsed: offCardId=${offCardId}, defCardId=${defCardId}`);

  // Parse optional --rolls argument
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--rolls' && i + 1 < args.length) {
      rolls = parseInt(args[i + 1], 10);
      if (isNaN(rolls) || rolls <= 0) {
        console.error('Invalid rolls count. Must be a positive integer.');
        process.exit(1);
      }
    }
  }

  console.log(`Running simulation with ${rolls} rolls`);

  try {
    const results = runSimulation(offCardId, defCardId, rolls);
    printResults(results);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Simulation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly as a script (not imported)
if (process.argv[1] && process.argv[1].includes('sim-matchup.mjs')) {
  main();
}

export { runSimulation, loadMatchupTable, loadPenaltyTable };
