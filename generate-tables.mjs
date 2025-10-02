#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the plays and defenses we need to create
const plays = [
  { play: 'ar-post-corner', offense: 'Post-Corner', risk: 'very-high' },
  { play: 'ar-levels', offense: 'Levels', risk: 'high' },
  { play: 'spread-levels-concept', offense: 'Levels Concept', risk: 'high' },
  { play: 'spread-post-wheel', offense: 'Post-Wheel', risk: 'very-high' }
];

const defenses = [
  'all-out-blitz',
  'cover-1',
  'cover-2',
  'cover-3',
  'cover-4',
  'cover-6',
  'goal-line',
  'inside-blitz',
  'outside-blitz',
  'prevent'
];

// Base template for a table
function createTableTemplate(offenseCard, defenseCard, riskProfile, explosiveStartSum) {
  return {
    "version": "1.0.0",
    "off_card": offenseCard,
    "def_card": defenseCard.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    "dice": "2d20",
    "entries": {},
    "doubles": {
      "1": {
        "result": "DEF_TD"
      },
      "20": {
        "result": "OFF_TD"
      },
      "2-19": {
        "penalty_table_ref": "penalty_table_v1"
      }
    },
    "meta": {
      "oob_bias": riskProfile === 'very-high',
      "field_pos_clamp": true,
      "risk_profile": riskProfile,
      "explosive_start_sum": explosiveStartSum
    }
  };
}

// Generate entries for a table based on risk profile
function generateEntries(riskProfile, explosiveStartSum) {
  const entries = {};

  // Low risk sums (3-15): mostly negative yards, sacks, turnovers
  for (let sum = 3; sum <= 15; sum++) {
    if (sum % 2 === 1) { // Odd sums: turnovers
      entries[sum.toString()] = {
        "turnover": {
          "type": sum <= 7 ? "INT" : "FUM",
          "return_yards": Math.floor(Math.random() * 20) + 10,
          "return_to": "LOS"
        },
        "clock": "10"
      };
    } else { // Even sums: negative yards/sacks
      entries[sum.toString()] = {
        "yards": -2 - Math.floor((sum - 4) / 2),
        "clock": "10",
        "tags": ["sack", "pressure"]
      };
    }
  }

  // Medium risk sums (16-24): small positive yards
  for (let sum = 16; sum <= 24; sum++) {
    entries[sum.toString()] = {
      "yards": Math.floor((sum - 15) * 1.5),
      "clock": "20",
      "tags": ["completion", "intermediate"]
    };
  }

  // High risk sums (25+): explosive plays
  for (let sum = 25; sum <= 39; sum++) {
    const yards = sum <= 30 ? sum + 5 : sum * 1.8;
    entries[sum.toString()] = {
      "yards": Math.floor(yards),
      "clock": "20",
      "tags": sum >= explosiveStartSum ? ["completion", "explosive", "deep"] : ["completion", "deep"]
    };
  }

  return entries;
}

// Main function to generate all tables
function generateAllTables() {
  console.log('🏗️  Generating matchup tables...');

  let generatedCount = 0;

  for (const play of plays) {
    for (const defense of defenses) {
      const tableName = `${play.play}__def-${defense}`;
      const outputPath = path.join(__dirname, 'data', 'tables_v1', play.play.includes('ar-') ? 'air_raid' : 'spread', `${tableName}.json`);

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create table
      const table = createTableTemplate(play.offense, defense, play.risk, play.risk === 'very-high' ? 25 : 22);
      table.entries = generateEntries(play.risk, play.risk === 'very-high' ? 25 : 22);

      // Write file
      fs.writeFileSync(outputPath, JSON.stringify(table, null, 2));

      console.log(`✅ Generated: ${tableName}`);
      generatedCount++;
    }
  }

  console.log(`\n🎉 Generated ${generatedCount} tables successfully!`);
  console.log(`📊 New total: ${281 + generatedCount} tables`);
}

// Run the generation
generateAllTables();
