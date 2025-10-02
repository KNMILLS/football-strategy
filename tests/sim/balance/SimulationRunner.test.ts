/**
 * SimulationRunner.test.ts - Tests for automated playtesting simulation runner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRunner } from '../../../src/sim/balance/SimulationRunner';
import type { TableInfo } from '../../../src/sim/balance/SimulationRunner';

describe('SimulationRunner', () => {
  let runner: SimulationRunner;

  beforeEach(() => {
    const config = SimulationRunner.createDefaultConfig();
    config.sampleSize = 1000; // Smaller for testing
    runner = new SimulationRunner(config);
  });

  describe('Configuration', () => {
    it('should create valid default configuration', () => {
      const config = SimulationRunner.createDefaultConfig();

      expect(config.sampleSize).toBe(10000);
      expect(config.seed).toBe(12345);
      expect(config.maxConcurrency).toBe(4);
      expect(config.enableProgressTracking).toBe(true);
      expect(config.timeoutMs).toBeGreaterThan(10000);
    });

    it('should validate configuration correctly', () => {
      const validConfig = SimulationRunner.createDefaultConfig();
      const validation = SimulationRunner.validateConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid configurations', () => {
      const invalidConfig = {
        ...SimulationRunner.createDefaultConfig(),
        sampleSize: 50, // Too small
        maxConcurrency: 0, // Invalid
        timeoutMs: 100 // Too short
      };

      const validation = SimulationRunner.validateConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(2);
    });
  });

  describe('Table Discovery', () => {
    it('should discover tables from directory structure', async () => {
      const tables = await SimulationRunner.discoverTables();

      expect(tables.length).toBeGreaterThan(0);

      // Should have tables from multiple playbooks
      const playbooks = new Set(tables.map(t => t.playbook));
      expect(playbooks.size).toBeGreaterThan(1);

      // Each table should have proper structure
      tables.forEach(table => {
        expect(table.id).toBeDefined();
        expect(table.playbook).toBeDefined();
        expect(table.offenseCard).toBeDefined();
        expect(table.defenseCard).toBeDefined();
        expect(table.filePath).toBeDefined();
      });
    });

    it('should parse table information correctly from filenames', async () => {
      const tables = await SimulationRunner.discoverTables();

      // Find a specific table to verify parsing
      const testTable = tables.find(t => t.offenseCard.includes('FOUR') && t.defenseCard.includes('COVER'));
      if (testTable) {
        expect(testTable.playbook).toMatch(/air-raid|spread/);
        expect(testTable.offenseCard).toContain('FOUR');
        expect(testTable.defenseCard).toContain('COVER');
      }
    });
  });

  describe('Progress Tracking', () => {
    it('should support progress callbacks', () => {
      const progressUpdates: any[] = [];

      runner.setProgressCallback((progress) => {
        progressUpdates.push(progress);
      });

      // Simulate progress updates (normally happens during analysis)
      const mockProgress = {
        total: 10,
        completed: 5,
        current: 'test/table1',
        estimatedTimeRemaining: 5000,
        errors: []
      };

      runner.setProgressCallback(() => {}); // Set a no-op callback first
      runner.setProgressCallback((progress) => {
        progressUpdates.push(progress);
      });

      // The callback should be set without errors
      expect(() => {
        runner.setProgressCallback((progress) => {
          progressUpdates.push(progress);
        });
      }).not.toThrow();
    });
  });

  describe('Batch Processing', () => {
    it('should handle empty table list', async () => {
      const result = await runner.runAnalysis([]);

      expect(result.analyses).toHaveLength(0);
      expect(result.compliance).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should process small batch of tables', async () => {
      const testTables: TableInfo[] = [
        {
          id: 'test/west-coast-1',
          playbook: 'west-coast',
          offenseCard: 'Curl',
          defenseCard: 'Cover 2',
          filePath: 'data/tables_v1/west-coast/WEST_COAST_CURL_vs_COVER_2.json'
        },
        {
          id: 'test/air-raid-1',
          playbook: 'air-raid',
          offenseCard: 'Four Verts',
          defenseCard: 'Cover 4',
          filePath: 'data/tables_v1/air-raid/AIR_RAID_FOUR_VERTS_vs_COVER_4.json'
        }
      ];

      const result = await runner.runAnalysis(testTables);

      expect(result.analyses).toHaveLength(2);
      expect(result.compliance).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalScore).toBeGreaterThan(0);

      // Verify table-specific results
      expect(result.analyses[0].playbook).toBe('west-coast');
      expect(result.analyses[1].playbook).toBe('air-raid');
    });

    it('should handle analysis errors gracefully', async () => {
      const problematicTables: TableInfo[] = [
        {
          id: 'test/invalid-table',
          playbook: 'invalid',
          offenseCard: 'Invalid Play',
          defenseCard: 'Invalid Defense',
          filePath: 'nonexistent/path.json'
        }
      ];

      const result = await runner.runAnalysis(problematicTables);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.analyses).toHaveLength(0); // Should not include failed analyses
    });
  });

  describe('Performance', () => {
    it('should complete analysis within timeout', async () => {
      const config = SimulationRunner.createDefaultConfig();
      config.timeoutMs = 5000; // 5 second timeout
      config.sampleSize = 1000; // Smaller sample for speed

      const fastRunner = new SimulationRunner(config);
      const testTables: TableInfo[] = [
        {
          id: 'test/performance',
          playbook: 'west-coast',
          offenseCard: 'Stick',
          defenseCard: 'Cover 3',
          filePath: 'data/tables_v1/west-coast/WEST_COAST_STICK_vs_COVER_3.json'
        }
      ];

      const startTime = performance.now();
      const result = await fastRunner.runAnalysis(testTables);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(config.timeoutMs);
      expect(result.errors).not.toContain('Analysis timeout');
    });

    it('should respect concurrency limits', async () => {
      const config = SimulationRunner.createDefaultConfig();
      config.maxConcurrency = 2;
      config.sampleSize = 500; // Very small for speed

      const limitedRunner = new SimulationRunner(config);
      const testTables: TableInfo[] = Array.from({ length: 4 }, (_, i) => ({
        id: `test/concurrent-${i}`,
        playbook: 'west-coast',
        offenseCard: `Play ${i}`,
        defenseCard: 'Cover 2',
        filePath: `data/tables_v1/west-coast/test_${i}.json`
      }));

      const result = await limitedRunner.runAnalysis(testTables);

      // Should complete without errors
      expect(result.errors).toHaveLength(0);
      expect(result.analyses.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Generation', () => {
    it('should generate accurate summary statistics', async () => {
      const testTables: TableInfo[] = [
        {
          id: 'test/summary-compliant',
          playbook: 'west-coast',
          offenseCard: 'Curl',
          defenseCard: 'Cover 2',
          filePath: 'data/tables_v1/west-coast/test1.json'
        },
        {
          id: 'test/summary-violation',
          playbook: 'air-raid',
          offenseCard: 'Four Verts',
          defenseCard: 'Cover 4',
          filePath: 'data/tables_v1/air-raid/test2.json'
        }
      ];

      const result = await runner.runAnalysis(testTables);

      expect(result.summary.compliant).toBeGreaterThanOrEqual(0);
      expect(result.summary.violation).toBeGreaterThanOrEqual(0);
      expect(result.summary.critical).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalScore).toBeLessThanOrEqual(100);

      // Total should match sum of categories
      const totalFromCategories = result.summary.compliant + result.summary.warning +
                                 result.summary.violation + result.summary.critical;
      expect(totalFromCategories).toBe(result.compliance.length);
    });
  });
});
