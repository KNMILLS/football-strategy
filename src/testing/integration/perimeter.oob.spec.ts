import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Perimeter OOB Audit', () => {
  // Perimeter plays that must have OOB entries
  const perimeterPlays = [
    'AR_DEEP_SHOT',
    'WZ_BUBBLE',
    'SPREAD_BUBBLE_SCREEN' // As specified in Phase 2 requirements
  ];

  it('should scan all perimeter play tables for OOB requirements', () => {
    const tablesDir = path.join(process.cwd(), 'data', 'tables_v1');
    const perimeterTables: string[] = [];

    // Find all perimeter play tables
    function scanDirectory(dir: string) {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.json')) {
          // Check if this table is for a perimeter play
          for (const perimeterPlay of perimeterPlays) {
            if (item.startsWith(perimeterPlay + '__')) {
              perimeterTables.push(fullPath);
              break;
            }
          }
        }
      }
    }

    scanDirectory(tablesDir);

    console.log(`Found ${perimeterTables.length} perimeter play tables`);

    // Test each perimeter table
    for (const tablePath of perimeterTables) {
      const table = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
      const entries = table.entries;

      // Count OOB entries in sums 11-24
      let oobCount = 0;
      let totalCount = 0;

      for (let sum = 11; sum <= 24; sum++) {
        const sumStr = sum.toString();
        if (entries[sumStr]) {
          totalCount++;
          if (entries[sumStr].oob === true && entries[sumStr].clock === "10") {
            oobCount++;
          }
        }
      }

      const oobPercentage = totalCount > 0 ? (oobCount / totalCount) * 100 : 0;

      console.log(`${path.basename(tablePath)}: ${oobCount}/${totalCount} (${oobPercentage.toFixed(1)}%) OOB entries`);

      // Assert minimum requirements
      expect(totalCount).toBeGreaterThan(0); // Table must have entries for 11-24

      // At least one entry must have oob: true AND clock: "10"
      const hasValidOobEntry = Object.values(entries).some((entry: any) =>
        entry.oob === true && entry.clock === "10"
      );
      expect(hasValidOobEntry).toBe(true);

      // Ideally ≥30% OOB rate (with ±2 tolerance as mentioned in spec)
      expect(oobPercentage).toBeGreaterThanOrEqual(28); // Allow ±2 tolerance
    }
  });

  it('should verify SPREAD_BUBBLE_SCREEN tables have proper OOB implementation', () => {
    // Test specific examples mentioned in Phase 2 acceptance criteria
    const testTables = [
      'data/tables_v1/spread/SPREAD_BUBBLE_SCREEN__DEF_COVER_2.json',
      'data/tables_v1/spread/SPREAD_BUBBLE_SCREEN__DEF_INSIDE_BLITZ.json'
    ];

    for (const tablePath of testTables) {
      expect(fs.existsSync(tablePath)).toBe(true);

      const table = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
      const entries = table.entries;

      // Count OOB entries in sums 11-24
      let oobCount = 0;
      let totalCount = 0;

      for (let sum = 11; sum <= 24; sum++) {
        const sumStr = sum.toString();
        if (entries[sumStr]) {
          totalCount++;
          if (entries[sumStr].oob === true && entries[sumStr].clock === "10") {
            oobCount++;
          }
        }
      }

      const oobPercentage = totalCount > 0 ? (oobCount / totalCount) * 100 : 0;

      console.log(`Manual check - ${path.basename(tablePath)}: ${oobPercentage.toFixed(1)}% OOB rate`);

      // Should have at least 30% OOB rate for perimeter plays
      expect(oobPercentage).toBeGreaterThanOrEqual(30);
    }
  });
});
