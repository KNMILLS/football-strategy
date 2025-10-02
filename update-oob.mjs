#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of perimeter plays that need OOB entries
const perimeterPlays = [
  // Existing plays with perimeter tags
  'sm-bootleg',
  'sm-power-sweep',
  'sm-pull-sweep',
  'sm-toss',
  'wc-outside-zone',
  'wz-bootleg',
  'wz-pull-sweep',
  'wz-sprint-out',
  'wz-stretch-zone',
  'wz-toss-sweep',
  // New perimeter-focused plays I created
  'ar-post-corner',
  'ar-levels',
  'spread-levels-concept',
  'spread-post-wheel'
];

// Function to add OOB entries to a table
function addOobEntries(tablePath) {
  try {
    const content = fs.readFileSync(tablePath, 'utf8');
    const table = JSON.parse(content);

    let modified = false;
    let oobCount = 0;

    // Add OOB to mid-range sums (18-28) for perimeter plays
    for (let sum = 18; sum <= 28; sum++) {
      const sumStr = sum.toString();
      if (table.entries[sumStr] && !table.entries[sumStr].oob) {
        // Add OOB and change clock to "10"
        table.entries[sumStr].oob = true;
        table.entries[sumStr].clock = "10";

        // Add boundary tag if not present
        if (!table.entries[sumStr].tags) {
          table.entries[sumStr].tags = [];
        }
        if (!table.entries[sumStr].tags.includes('boundary')) {
          table.entries[sumStr].tags.push('boundary');
        }

        modified = true;
        oobCount++;
      }
    }

    if (modified) {
      fs.writeFileSync(tablePath, JSON.stringify(table, null, 2));
      console.log(`✅ Updated ${path.basename(tablePath)}: added ${oobCount} OOB entries`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${tablePath}: ${error.message}`);
    return false;
  }
}

// Main function to update all perimeter tables
function updateAllPerimeterTables() {
  console.log('🔍 Finding perimeter tables to update...');

  let updatedCount = 0;

  for (const play of perimeterPlays) {
    // Find all tables for this play across all offensive systems
    const searchPaths = [
      `data/tables_v1/air_raid/${play}__def-*.json`,
      `data/tables_v1/spread/${play}__def-*.json`,
      `data/tables_v1/smashmouth/${play}__def-*.json`,
      `data/tables_v1/west_coast/${play}__def-*.json`,
      `data/tables_v1/wide_zone/${play}__def-*.json`
    ];

    for (const searchPath of searchPaths) {
      try {
        const files = fs.readdirSync(path.dirname(searchPath)).filter(file =>
          file.startsWith(path.basename(searchPath).split('*')[0]) &&
          file.endsWith('.json')
        );

        for (const file of files) {
          const fullPath = path.join(path.dirname(searchPath), file);
          if (addOobEntries(fullPath)) {
            updatedCount++;
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    }
  }

  console.log(`\n🎉 Updated ${updatedCount} perimeter tables with OOB entries!`);
}

// Run the update
updateAllPerimeterTables();
