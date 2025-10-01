#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLCG } from '../dist/sim/RNG.js';
import { determineOutcomeFromCharts } from '../dist/rules/Charts.js';
import { OffenseChartsSchema } from '../dist/data/schemas/OffenseCharts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a comprehensive baseline of deterministic outcomes
 */
function generateDeterministicBaseline() {
  console.log('🎲 Generating deterministic baseline with seeded RNG...\n');

  // Load offense charts data
  const chartsPath = path.join(__dirname, '..', 'data', 'football_strategy_all_mappings.json');
  const rawData = fs.readFileSync(chartsPath, 'utf8');
  const parsedData = JSON.parse(rawData);
  const charts = parsedData.OffenseCharts;

  // Define test scenarios
  const testScenarios = [
    // Pro Style plays
    { deckName: 'Pro Style', playLabel: 'Power Up Middle', defenseLabel: 'Inside Blitz' },
    { deckName: 'Pro Style', playLabel: 'Power Up Middle', defenseLabel: 'Goal Line' },
    { deckName: 'Pro Style', playLabel: 'QB Keeper', defenseLabel: 'Running' },
    { deckName: 'Pro Style', playLabel: 'Slant Run', defenseLabel: 'Pass & Run' },
    { deckName: 'Pro Style', playLabel: 'Long Bomb', defenseLabel: 'Prevent' },

    // Ball Control plays
    { deckName: 'Ball Control', playLabel: 'Power Up Middle', defenseLabel: 'Short Yardage' },
    { deckName: 'Ball Control', playLabel: 'QB Keeper', defenseLabel: 'Inside Blitz' },
    { deckName: 'Ball Control', playLabel: 'Screen Pass', defenseLabel: 'Outside Blitz' },

    // Aerial Style plays
    { deckName: 'Aerial Style', playLabel: 'Power Up Middle', defenseLabel: 'Passing' },
    { deckName: 'Aerial Style', playLabel: 'Down & Out Pass', defenseLabel: 'Prevent Deep' },
    { deckName: 'Aerial Style', playLabel: 'Long Bomb', defenseLabel: 'Goal Line' },
  ];

  // Use a fixed seed for deterministic results
  const seed = 12345;
  const rng = createLCG(seed);

  const baselineResults = {
    metadata: {
      seed,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      description: 'Deterministic baseline for current card-based system with seeded RNG',
    },
    scenarios: [],
  };

  console.log(`Using seed: ${seed}`);
  console.log(`Testing ${testScenarios.length} scenarios...\n`);

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];

    try {
      // Generate a fresh RNG for each scenario to ensure deterministic but varied results
      const scenarioRng = createLCG(seed + i);

      const outcome = determineOutcomeFromCharts({
        ...scenario,
        charts,
        rng: scenarioRng,
      });

      baselineResults.scenarios.push({
        id: `scenario_${i + 1}`,
        deckName: scenario.deckName,
        playLabel: scenario.playLabel,
        defenseLabel: scenario.defenseLabel,
        outcome: {
          category: outcome.category,
          yards: outcome.yards,
          description: outcome.description,
        },
        seed: seed + i,
      });

      console.log(`✅ Scenario ${i + 1}: ${scenario.deckName} - ${scenario.playLabel} vs ${scenario.defenseLabel}`);
      console.log(`   Result: ${outcome.category} ${outcome.yards} yards`);
      if (outcome.description) {
        console.log(`   Description: ${outcome.description}`);
      }
      console.log('');

    } catch (error) {
      console.error(`❌ Scenario ${i + 1} failed: ${error.message}`);
      baselineResults.scenarios.push({
        id: `scenario_${i + 1}`,
        deckName: scenario.deckName,
        playLabel: scenario.playLabel,
        defenseLabel: scenario.defenseLabel,
        error: error.message,
        seed: seed + i,
      });
    }
  }

  return baselineResults;
}

/**
 * Save baseline to file
 */
function saveBaseline(baseline) {
  const baselinePath = path.join(__dirname, '..', 'tests', 'golden', 'deterministic-baseline.json');
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  console.log(`💾 Baseline saved to: ${baselinePath}`);
}

/**
 * Main function
 */
function main() {
  try {
    const baseline = generateDeterministicBaseline();
    saveBaseline(baseline);

    console.log(`\n🎉 Successfully generated baseline for ${baseline.scenarios.length} scenarios`);
    console.log('\n📋 Summary:');
    console.log(`  - Successful scenarios: ${baseline.scenarios.filter(s => !s.error).length}`);
    console.log(`  - Failed scenarios: ${baseline.scenarios.filter(s => s.error).length}`);

    process.exit(0);
  } catch (error) {
    console.error(`💥 Failed to generate baseline: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateDeterministicBaseline };
