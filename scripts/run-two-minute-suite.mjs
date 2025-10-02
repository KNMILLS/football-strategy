#!/usr/bin/env node

/**
 * Two-Minute Drill Scenario Test Runner
 *
 * Executes comprehensive two-minute drill scenarios for validating
 * late-game clock management, desperation plays, penalty decisions,
 * and sideline management in football simulation.
 *
 * Usage:
 *   node scripts/run-two-minute-suite.mjs
 *   node scripts/run-two-minute-suite.mjs --verbose
 *   node scripts/run-two-minute-suite.mjs --filter="Clock Edge Cases"
 */

import { performance } from 'perf_hooks';
import { ScenarioFactory } from '../tests/scenarios/two-minute/ScenarioFramework.test.ts';

/**
 * Test suite configuration
 */
const SUITE_CONFIG = {
  name: 'Two-Minute Drill Test Suite',
  version: '1.0.0',
  timeout: 10000, // 10 second timeout per scenario
  performanceThreshold: 500, // Max 500ms per scenario
};

/**
 * Command line arguments
 */
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filter = args.find(arg => arg.startsWith('--filter='))?.split('=')[1];

/**
 * Test results accumulator
 */
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  scenarios: []
};

/**
 * Scenario definitions for the two-minute drill suite
 */
const SCENARIO_DEFINITIONS = [
  // Clock Edge Cases
  {
    category: 'Clock Edge Cases',
    scenarios: [
      {
        name: 'Incomplete Pass Time Expiration',
        factory: 'createClockEdgeCase',
        config: {
          name: 'Incomplete Pass Time Expiration',
          description: 'Clock expires during incomplete pass resolution',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 3,
            down: 4,
            toGo: 10,
            ballOn: 80,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 20, ai: 21 }
          }
        }
      },
      {
        name: 'Field Goal Time Expiration',
        factory: 'createClockEdgeCase',
        config: {
          name: 'Field Goal Time Expiration',
          description: 'Clock expires during field goal attempt resolution',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 2,
            down: 4,
            toGo: 3,
            ballOn: 25,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 20, ai: 23 }
          }
        }
      }
    ]
  },

  // Desperation Plays
  {
    category: 'Desperation Plays',
    scenarios: [
      {
        name: 'Successful Hail Mary TD',
        factory: 'createDesperationPlay',
        config: {
          name: 'Successful Hail Mary TD',
          description: 'Hail Mary pass results in game-winning touchdown',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 5,
            down: 4,
            toGo: 50,
            ballOn: 50,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 20, ai: 27 }
          }
        }
      },
      {
        name: 'Successful Lateral TD',
        factory: 'createDesperationPlay',
        config: {
          name: 'Successful Lateral TD',
          description: 'Lateral play results in game-winning touchdown',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 8,
            down: 3,
            toGo: 15,
            ballOn: 30,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 21, ai: 28 }
          }
        }
      }
    ]
  },

  // Penalty Pressure
  {
    category: 'Penalty Pressure',
    scenarios: [
      {
        name: 'Decline Defensive Penalty for First Down',
        factory: 'createPenaltyPressure',
        config: {
          name: 'Decline Defensive Penalty for First Down',
          description: 'Decline penalty that would give offense automatic first down',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 45,
            down: 4,
            toGo: 2,
            ballOn: 75,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 20, ai: 21 }
          }
        }
      }
    ]
  },

  // Sideline Management
  {
    category: 'Sideline Management',
    scenarios: [
      {
        name: 'Strategic Timeout Usage',
        factory: 'createSidelineManagement',
        config: {
          name: 'Strategic Timeout Usage',
          description: 'Use timeout to stop clock and preserve time for game-winning drive',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 90,
            down: 1,
            toGo: 10,
            ballOn: 75,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 20, ai: 27 }
          }
        }
      },
      {
        name: 'Critical Challenge Decision',
        factory: 'createSidelineManagement',
        config: {
          name: 'Critical Challenge Decision',
          description: 'Challenge a critical play that could change game outcome',
          initialState: {
            seed: 12345,
            quarter: 4,
            clock: 80,
            down: 3,
            toGo: 3,
            ballOn: 45,
            possession: 'player',
            awaitingPAT: false,
            gameOver: false,
            score: { player: 14, ai: 17 }
          }
        }
      }
    ]
  }
];

/**
 * Main test execution function
 */
async function runTwoMinuteSuite() {
  console.log(`🏈 ${SUITE_CONFIG.name} v${SUITE_CONFIG.version}`);
  console.log('=' .repeat(60));

  const startTime = performance.now();

  // Execute all scenario categories
  for (const category of SCENARIO_DEFINITIONS) {
    if (filter && !category.category.toLowerCase().includes(filter.toLowerCase())) {
      continue;
    }

    console.log(`\n📂 ${category.category}`);
    console.log('-'.repeat(40));

    for (const scenarioDef of category.scenarios) {
      if (filter && !scenarioDef.name.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }

      await runScenario(category.category, scenarioDef);
    }
  }

  // Print summary
  printSummary();

  const endTime = performance.now();
  testResults.duration = endTime - startTime;

  return testResults.failed === 0;
}

/**
 * Execute a single scenario
 */
async function runScenario(category, scenarioDef) {
  testResults.total++;

  try {
    const scenarioStart = performance.now();

    // Create scenario instance using factory
    const scenario = ScenarioFactory[scenarioDef.factory](scenarioDef.config);

    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Scenario timeout after ${SUITE_CONFIG.timeout}ms`)), SUITE_CONFIG.timeout);
    });

    // Execute scenario
    const resultPromise = scenario.execute();
    const result = await Promise.race([resultPromise, timeoutPromise]);

    const scenarioEnd = performance.now();
    const duration = scenarioEnd - scenarioStart;

    // Record result
    const scenarioResult = {
      category,
      name: scenarioDef.name,
      success: result.success,
      duration,
      errors: result.errors,
      warnings: result.warnings,
      events: result.events.length
    };

    testResults.scenarios.push(scenarioResult);

    // Print result
    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${scenarioDef.name} (${duration.toFixed(1)}ms)`);

      if (verbose) {
        console.log(`   Events: ${result.events.length}`);
        if (result.warnings.length > 0) {
          console.log(`   Warnings: ${result.warnings.length}`);
        }
      }
    } else {
      testResults.failed++;
      console.log(`❌ ${scenarioDef.name} (${duration.toFixed(1)}ms)`);

      if (verbose || result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   Error: ${error}`);
        });
      }
    }

    // Performance warning
    if (duration > SUITE_CONFIG.performanceThreshold) {
      console.log(`   ⚠️  Performance: ${duration.toFixed(1)}ms (threshold: ${SUITE_CONFIG.performanceThreshold}ms)`);
    }

  } catch (error) {
    testResults.failed++;
    console.log(`💥 ${scenarioDef.name} - ${error.message}`);

    testResults.scenarios.push({
      category,
      name: scenarioDef.name,
      success: false,
      duration: 0,
      errors: [error.message],
      warnings: [],
      events: 0
    });
  }
}

/**
 * Print test suite summary
 */
function printSummary() {
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));

  console.log(`Total Scenarios: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  console.log(`⏱️  Duration: ${testResults.duration.toFixed(1)}ms`);

  if (testResults.total > 0) {
    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
  }

  // Performance summary
  const avgDuration = testResults.scenarios.reduce((sum, s) => sum + s.duration, 0) / testResults.scenarios.length;
  console.log(`⚡ Average Duration: ${avgDuration.toFixed(1)}ms`);

  const slowScenarios = testResults.scenarios.filter(s => s.duration > SUITE_CONFIG.performanceThreshold);
  if (slowScenarios.length > 0) {
    console.log(`🐌 Slow Scenarios: ${slowScenarios.length}`);
    if (verbose) {
      slowScenarios.forEach(s => {
        console.log(`   ${s.name}: ${s.duration.toFixed(1)}ms`);
      });
    }
  }

  console.log('=' .repeat(60));
}

/**
 * Generate detailed report for failed scenarios
 */
function generateFailureReport() {
  const failures = testResults.scenarios.filter(s => !s.success);

  if (failures.length === 0) {
    return;
  }

  console.log('\n🚨 FAILURE DETAILS');
  console.log('=' .repeat(60));

  failures.forEach((failure, index) => {
    console.log(`\n${index + 1}. ${failure.category} > ${failure.name}`);
    console.log(`   Duration: ${failure.duration.toFixed(1)}ms`);
    console.log(`   Events: ${failure.events}`);

    failure.errors.forEach(error => {
      console.log(`   ❌ ${error}`);
    });

    failure.warnings.forEach(warning => {
      console.log(`   ⚠️  ${warning}`);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    const success = await runTwoMinuteSuite();

    if (!success) {
      generateFailureReport();
      process.exit(1);
    }

    console.log('\n🎉 All two-minute drill scenarios passed!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Fatal error running test suite:', error);
    process.exit(1);
  }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTwoMinuteSuite, SCENARIO_DEFINITIONS, SUITE_CONFIG };
