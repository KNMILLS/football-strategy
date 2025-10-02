/**
 * StatisticalAnalyzer.test.ts - Tests for distribution analysis engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StatisticalAnalyzer } from '../../../src/sim/balance/StatisticalAnalyzer';
import { createLCG } from '../../../src/sim/RNG';
import { STATISTICAL_THRESHOLDS } from '../../../src/sim/balance/Guardrails';

describe('StatisticalAnalyzer', () => {
  let analyzer: StatisticalAnalyzer;
  const testSeed = 12345;

  beforeEach(() => {
    const rng = createLCG(testSeed);
    analyzer = new StatisticalAnalyzer(rng);
  });

  describe('Table Analysis', () => {
    it('should analyze a table and return valid results', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/west-coast-curl-vs-cover-2',
        'Curl',
        'Cover 2',
        'West Coast',
        1000 // Smaller sample for testing
      );

      expect(analysis.tableId).toBe('test/west-coast-curl-vs-cover-2');
      expect(analysis.playbook).toBe('West Coast');
      expect(analysis.offenseCard).toBe('Curl');
      expect(analysis.defenseCard).toBe('Cover 2');
      expect(analysis.sampleSize).toBe(1000);

      // Validate metrics are in reasonable ranges
      expect(analysis.avgYards).toBeGreaterThan(0);
      expect(analysis.avgYards).toBeLessThan(20);
      expect(analysis.turnoverRate).toBeGreaterThanOrEqual(0);
      expect(analysis.turnoverRate).toBeLessThanOrEqual(100);
      expect(analysis.explosiveRate).toBeGreaterThanOrEqual(0);
      expect(analysis.explosiveRate).toBeLessThanOrEqual(100);

      // Clock distribution should sum to ~100%
      const clockSum = analysis.clockDistribution[10] + analysis.clockDistribution[20] + analysis.clockDistribution[30];
      expect(clockSum).toBeGreaterThan(90);
      expect(clockSum).toBeLessThanOrEqual(100);
    });

    it('should produce deterministic results with same seed', async () => {
      const analysis1 = await analyzer.analyzeTable(
        'test/table1', 'Play A', 'Defense A', 'West Coast', 1000
      );

      // Create new analyzer with same seed
      const rng2 = createLCG(testSeed);
      const analyzer2 = new StatisticalAnalyzer(rng2);
      const analysis2 = await analyzer2.analyzeTable(
        'test/table1', 'Play A', 'Defense A', 'West Coast', 1000
      );

      expect(analysis1.avgYards).toBe(analysis2.avgYards);
      expect(analysis1.turnoverRate).toBe(analysis2.turnoverRate);
      expect(analysis1.explosiveRate).toBe(analysis2.explosiveRate);
    });

    it('should validate analysis meets statistical thresholds', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/table1', 'Play A', 'Defense A', 'West Coast', 1000
      );

      const validation = analyzer.validateAnalysis(analysis);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect insufficient sample size', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/table1', 'Play A', 'Defense A', 'West Coast', 50 // Below minimum
      );

      const validation = analyzer.validateAnalysis(analysis);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Sample size 50 below minimum 1000');
    });
  });

  describe('Distribution Metrics', () => {
    it('should calculate accurate distribution statistics', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/consistent-run', 'Inside Zone', 'Cover 3', 'Smashmouth', 5000
      );

      // Run plays should have lower variance than pass plays
      expect(analysis.yardsStdDev).toBeGreaterThan(2);
      expect(analysis.yardsStdDev).toBeLessThan(6);

      // Average yards should be within a reasonable football range
      expect(analysis.avgYards).toBeGreaterThan(0);
      expect(analysis.avgYards).toBeLessThan(12);
    });

    it('should properly identify explosive plays', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/explosive-pass', 'Four Verts', 'Cover 4', 'Air Raid', 5000
      );

      // Explosive rate should be non-trivial but bounded
      expect(analysis.explosiveRate).toBeGreaterThan(5);
      expect(analysis.explosiveRate).toBeLessThan(40);
    });

    it('should calculate realistic turnover rates', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/high-turnover', ' risky play', 'aggressive defense', 'Spread', 5000
      );

      expect(analysis.turnoverRate).toBeGreaterThan(5);
      expect(analysis.turnoverRate).toBeLessThan(25);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = performance.now();

      await analyzer.analyzeTable(
        'test/performance', 'Play A', 'Defense A', 'West Coast', 1000
      );

      const duration = performance.now() - startTime;

      // Should complete within 1 second for small sample
      expect(duration).toBeLessThan(1000);
    });

    it('should handle memory efficiently', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/memory', 'Play A', 'Defense A', 'West Coast', 1000
      );

      // Memory usage should be reasonable (rough estimate)
      expect(analysis.memoryUsage).toBeGreaterThan(0);
      expect(analysis.memoryUsage).toBeLessThan(1000000); // Less than 1MB
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme yardage values appropriately', async () => {
      const analysis = await analyzer.analyzeTable(
        'test/extreme', 'Hail Mary', 'Prevent', 'Air Raid', 2000
      );

      // Should still produce valid statistics even with extreme values
      expect(Number.isFinite(analysis.avgYards)).toBe(true);
      expect(Number.isFinite(analysis.yardsStdDev)).toBe(true);
      expect(analysis.turnoverRate).toBeGreaterThanOrEqual(0);
      expect(analysis.turnoverRate).toBeLessThanOrEqual(100);
    });

    it('should handle zero-variance distributions', async () => {
      // This would require a specially crafted table that always returns same outcome
      // For now, we test that the analyzer doesn't crash
      const analysis = await analyzer.analyzeTable(
        'test/zero-variance', 'Consistent Play', 'Basic Defense', 'Smashmouth', 1000
      );

      expect(analysis).toBeDefined();
      expect(Number.isFinite(analysis.avgYards)).toBe(true);
    });
  });
});
