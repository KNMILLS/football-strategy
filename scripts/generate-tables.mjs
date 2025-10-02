#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Tier-1 play mappings
const TIER_1_PLAYS = {
  'WEST_COAST': [
    { id: 'wc-quick-slant', label: 'Quick Slant', type: 'pass', depth: 'short' },
    { id: 'wc-screen-pass', label: 'Screen Pass', type: 'pass', depth: 'short' },
    { id: 'wc-stick-route', label: 'Stick Route', type: 'pass', depth: 'short' },
    { id: 'wc-slants', label: 'Slants', type: 'pass', depth: 'short' },
    { id: 'wc-rb-screen', label: 'RB Screen', type: 'pass', depth: 'short' },
    { id: 'wc-flood-concept', label: 'Flood Concept', type: 'pass', depth: 'mid' }
  ],
  'SPREAD': [
    { id: 'spread-mesh-concept', label: 'Mesh Concept', type: 'pass', depth: 'short' },
    { id: 'spread-smash-route', label: 'Smash Route', type: 'pass', depth: 'mid' },
    { id: 'spread-air-raid', label: 'Air Raid', type: 'pass', depth: 'deep' },
    { id: 'spread-rpo-bubble', label: 'RPO Bubble', type: 'pass', depth: 'short' },
    { id: 'spread-zone-read', label: 'Zone Read', type: 'run', depth: 'short' },
    { id: 'spread-rpo-bubble', label: 'RPO Bubble', type: 'pass', depth: 'short' }
  ],
  'AIR_RAID': [
    { id: 'AIR_RAID_FOUR_VERTS', label: 'Four Verticals', type: 'pass', depth: 'deep' },
    { id: 'AIR_RAID_MILLS', label: 'Mills', type: 'pass', depth: 'short' },
    { id: 'ar-spot', label: 'Spot', type: 'pass', depth: 'short' },
    { id: 'AIR_RAID_PA_DEEP_SHOT', label: 'PA Deep Shot', type: 'pass', depth: 'deep' },
    { id: 'ar-y-stick', label: 'Y-Stick', type: 'pass', depth: 'short' },
    { id: 'ar-spot', label: 'Spot', type: 'pass', depth: 'short' }
  ],
  'SMASHMOUTH': [
    { id: 'sm-power-o', label: 'Power O', type: 'run', depth: 'short' },
    { id: 'sm-counter', label: 'Counter', type: 'run', depth: 'short' },
    { id: 'sm-iso', label: 'Iso', type: 'run', depth: 'short' },
    { id: 'sm-toss', label: 'Toss', type: 'run', depth: 'short' },
    { id: 'sm-bootleg', label: 'Bootleg', type: 'pass', depth: 'mid' },
    { id: 'sm-te-seam', label: 'TE Seam', type: 'pass', depth: 'mid' }
  ],
  'WIDE_ZONE': [
    { id: 'wz-wide-zone', label: 'Wide Zone', type: 'run', depth: 'short' },
    { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run', depth: 'short' },
    { id: 'wz-counter', label: 'Counter', type: 'run', depth: 'short' },
    { id: 'wz-bootleg', label: 'Bootleg', type: 'pass', depth: 'mid' },
    { id: 'wz-play-action', label: 'Play Action', type: 'pass', depth: 'mid' },
    { id: 'wz-toss-sweep', label: 'Toss Sweep', type: 'run', depth: 'short' }
  ]
};

// Defensive cards
const DEFENSIVE_CARDS = [
  { id: 'def-goal-line', label: 'Goal Line' },
  { id: 'def-all-out-blitz', label: 'All-Out Blitz' },
  { id: 'def-inside-blitz', label: 'Inside Blitz' },
  { id: 'def-outside-blitz', label: 'Outside Blitz' },
  { id: 'def-cover-1', label: 'Cover 1' },
  { id: 'def-cover-2', label: 'Cover 2' },
  { id: 'def-cover-3', label: 'Cover 3' },
  { id: 'def-cover-4', label: 'Cover 4' },
  { id: 'def-cover-6', label: 'Cover 6' },
  { id: 'def-prevent', label: 'Prevent' }
];

// Generate table entries for a specific play type and defense
function generateTableEntries(playType, playDepth, defenseType) {
  const entries = {};

  // Base patterns based on play type and defense
  const isPass = playType === 'pass';
  const isRun = playType === 'run';
  const isDeep = playDepth === 'deep';
  const isAggressiveDefense = ['def-all-out-blitz', 'def-inside-blitz', 'def-outside-blitz', 'def-cover-1'].includes(defenseType);
  const isGoalLineDefense = defenseType === 'def-goal-line';
  const isPreventDefense = defenseType === 'def-prevent';

  // Turnover band (3-5): always negative or small positive for turnovers
  for (let sum = 3; sum <= 5; sum++) {
    if (isAggressiveDefense) {
      // Aggressive defenses create more turnovers - deterministic based on sum
      const shouldTurnover = sum === 3 || sum === 5; // Deterministic pattern
      if (shouldTurnover) {
        entries[sum] = {
          turnover: {
            type: sum === 3 ? 'INT' : 'FUM', // Deterministic
            return_yards: 10 + (sum * 2), // Deterministic calculation
            return_to: 'LOS'
          },
          clock: "10"
        };
      } else {
        entries[sum] = {
          yards: isPass ? -2 : -1,
          clock: "10",
          tags: isPass ? ["incompletion", "pressure"] : ["stuff"]
        };
      }
    } else {
      entries[sum] = {
        yards: isPass ? -2 : -1,
        clock: "10",
        tags: isPass ? ["incompletion", "pressure"] : ["stuff"]
      };
    }
  }

  // Main game outcomes (6-39)
  for (let sum = 6; sum <= 39; sum++) {
    let yards;
    let clock;
    let tags = [];

    if (isPass) {
      // Pass play patterns
      if (isDeep) {
        // Deep passes: boom or bust
        if (sum <= 15) {
          yards = -2;
          clock = "10";
          tags = ["incompletion", "deep"];
        } else if (sum <= 25) {
          yards = Math.floor((sum - 15) * 2.5);
          clock = "20";
          tags = ["completion", "intermediate"];
        } else {
          yards = Math.floor((sum - 25) * 4) + 15;
          clock = "20";
          tags = ["completion", "explosive", "deep"];
        }
      } else {
        // Short passes: consistent, moderate gains
        yards = Math.floor((sum - 5) * 0.8) + 2;
        clock = sum >= 20 ? "20" : "10";
        tags = ["completion", "short"];
        if (yards >= 10) tags.push("first_down");
      }
    } else {
      // Run play patterns
      if (isGoalLineDefense || isAggressiveDefense) {
        // Against aggressive defenses, runs struggle
        yards = Math.max(-2, Math.floor((sum - 5) * 0.4) - 1);
        clock = "30";
        tags = yards > 0 ? ["gain"] : ["stuff"];
      } else {
        // Normal run game
        yards = Math.floor((sum - 5) * 0.6) + 1;
        clock = "30";
        tags = ["gain"];
        if (yards >= 4) tags.push("solid");
      }
    }

    // Special defense adjustments
    if (isPreventDefense && isDeep) {
      yards = Math.min(yards, 25); // Prevent limits big plays
      tags.push("prevent");
    }

    entries[sum] = { yards, clock, tags };
  }

  return entries;
}

// Generate doubles outcomes
function generateDoublesOutcomes(playType, defenseType) {
  const isAggressiveDefense = ['def-all-out-blitz', 'def-inside-blitz', 'def-outside-blitz'].includes(defenseType);

  return {
    "1": { result: "DEF_TD" },
    "20": { result: "OFF_TD" },
    "2-19": { penalty_table_ref: "penalty_table_v1" }
  };
}

// Generate meta data
function generateMetaData(playType, playDepth, perimeterBias = false) {
  const riskProfile = playType === 'pass' && playDepth === 'deep' ? 'high' :
                     playType === 'run' ? 'low' : 'medium';

  return {
    oob_bias: perimeterBias,
    field_pos_clamp: true,
    risk_profile: riskProfile,
    explosive_start_sum: playType === 'pass' && playDepth === 'deep' ? 25 : 20
  };
}

// Generate a complete table
function generateTable(offensivePlay, defensiveCard) {
  const entries = generateTableEntries(offensivePlay.type, offensivePlay.depth, defensiveCard.id);
  const doubles = generateDoublesOutcomes(offensivePlay.type, defensiveCard.id);
  const meta = generateMetaData(offensivePlay.type, offensivePlay.depth, offensivePlay.perimeter);

  return {
    version: "1.0.0",
    off_card: offensivePlay.label,
    def_card: defensiveCard.label,
    dice: "2d20",
    entries,
    doubles,
    meta
  };
}

// Main generation function
function generateAllTables() {
  const tablesDir = 'data/tables_v1';

  for (const [playbook, plays] of Object.entries(TIER_1_PLAYS)) {
    const playbookDir = join(tablesDir, playbook.toLowerCase());

    if (!existsSync(playbookDir)) {
      mkdirSync(playbookDir, { recursive: true });
    }

    for (const play of plays) {
      for (const defense of DEFENSIVE_CARDS) {
        const table = generateTable(play, defense);
        const filename = `${play.id}__${defense.id}.json`;
        const filepath = join(playbookDir, filename);

        writeFileSync(filepath, JSON.stringify(table, null, 2));
        console.log(`Generated: ${filepath}`);
      }
    }
  }
}

// Run generation
generateAllTables();
console.log('Table generation complete!');
