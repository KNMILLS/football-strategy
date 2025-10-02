/**
 * OutlierDetector.test.ts - Tests for statistical outlier detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutlierDetector } from '../../../src/sim/balance/OutlierDetector';
import type { TableAnalysis } from '../../../src/sim/balance/StatisticalAnalyzer';

describe('OutlierDetector', () => {
  let detector: OutlierDetector;

  beforeEach(() => {
    detector = new OutlierDetector();
  });

  describe('Outlier Detection', () => {
    it('should detect no outliers in balanced dataset', () => {
      const balancedAnalyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Curl', 'Cover 2', 7.0, 15, 20, 6),
        createMockAnalysis('west-coast', 'Slant', 'Man Press', 7.2, 16, 19, 7),
        createMockAnalysis('west-coast', 'Stick', 'Cover 3', 7.1, 14, 21, 6),
        createMockAnalysis('west-coast', 'Out', 'Zone Blitz', 6.9, 17, 18, 8)
      ];

      const outliers = detector.detectOutliers(balancedAnalyses);

      expect(outliers.length).toBe(4);
      outliers.forEach(outlier => {
        expect(outlier.outlierCount).toBe(0);
        expect(outlier.severity).toBe('low');
      });
    });

    it('should detect outliers in unbalanced dataset', () => {
      const unbalancedAnalyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Normal Play', 'Cover 2', 7.0, 15, 20, 6),
        createMockAnalysis('west-coast', 'Outlier Play', 'Cover 2', 25.0, 5, 50, 20), // Extreme outlier
        createMockAnalysis('west-coast', 'Another Normal', 'Cover 2', 7.1, 16, 19, 7)
      ];

      const outliers = detector.detectOutliers(unbalancedAnalyses);

      expect(outliers.length).toBe(3);
      const outlierAnalysis = outliers.find(o => o.tableId === 'west-coast/outlier-play');
      expect(outlierAnalysis).toBeDefined();
      expect(outlierAnalysis!.outlierCount).toBeGreaterThan(0);
      expect(outlierAnalysis!.severity).toMatch(/^(medium|high|critical)$/);
    });

    it('should detect playbook identity violations', () => {
      const playbookViolationAnalyses: TableAnalysis[] = [
        createMockAnalysis('air-raid', 'Pass Heavy', 'Cover 4', 12.0, 15, 30, 6), // Normal Air Raid
        createMockAnalysis('air-raid', 'Run Heavy', 'Cover 4', 4.0, 15, 5, 6), // Violates Air Raid identity
        createMockAnalysis('smashmouth', 'Ground Game', 'Cover 2', 5.0, 15, 10, 6), // Normal Smashmouth
        createMockAnalysis('smashmouth', 'Air Attack', 'Cover 2', 15.0, 15, 35, 6) // Violates Smashmouth identity
      ];

      const outliers = detector.detectOutliers(playbookViolationAnalyses);

      // Should detect outliers in the identity-violating tables
      const airRaidOutlier = outliers.find(o => o.tableId === 'air-raid/run-heavy');
      const smashmouthOutlier = outliers.find(o => o.tableId === 'smashmouth/air-attack');

      expect(airRaidOutlier!.outlierCount).toBeGreaterThan(0);
      expect(smashmouthOutlier!.outlierCount).toBeGreaterThan(0);
    });

    it('should handle small datasets gracefully', () => {
      const smallDataset: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Only Play', 'Cover 2', 7.0, 15, 20, 6)
      ];

      const outliers = detector.detectOutliers(smallDataset);

      expect(outliers.length).toBe(1);
      expect(outliers[0].outlierCount).toBe(0); // No outliers detectable with single data point
    });
  });

  describe('Outlier Analysis', () => {
    it('should analyze outlier severity correctly', () => {
      const analysesWithMultipleOutliers: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Normal 1', 'Cover 2', 7.0, 15, 20, 6),
        createMockAnalysis('west-coast', 'Multiple Issues', 'Cover 2', 25.0, 40, 5, 25), // Many outliers
        createMockAnalysis('west-coast', 'Normal 2', 'Cover 2', 7.1, 16, 19, 7)
      ];

      const outliers = detector.detectOutliers(analysesWithMultipleOutliers);
      const severeOutlier = outliers.find(o => o.tableId === 'west-coast/multiple-issues');

      expect(severeOutlier!.severity).toBe('critical');
      expect(severeOutlier!.outlierCount).toBeGreaterThan(3);
    });

    it('should identify primary issues correctly', () => {
      const analysisWithKnownIssues: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Issue Table', 'Cover 2', 30.0, 35, 45, 20) // High on multiple metrics
      ];

      const outliers = detector.detectOutliers(analysisWithKnownIssues);
      const outlier = outliers[0];

      expect(outlier.primaryIssues.length).toBeGreaterThan(0);
      expect(outlier.primaryIssues).toContain('avgYards');
      expect(outlier.primaryIssues).toContain('turnoverRate');
      expect(outlier.primaryIssues).toContain('explosiveRate');
    });

    it('should generate meaningful risk assessments', () => {
      const analyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Low Risk', 'Cover 2', 7.5, 15, 20, 6), // Minor outlier
        createMockAnalysis('west-coast', 'High Risk', 'Cover 2', 35.0, 45, 60, 30) // Major outlier
      ];

      const outliers = detector.detectOutliers(analyses);

      const lowRisk = outliers.find(o => o.tableId === 'west-coast/low-risk');
      const highRisk = outliers.find(o => o.tableId === 'west-coast/high-risk');

      expect(lowRisk!.riskAssessment).toContain('Low-risk');
      expect(highRisk!.riskAssessment).toContain('Critical');
    });
  });

  describe('Filtering and Summary', () => {
    it('should filter outliers by severity', () => {
      const analyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Mixed Severity', 'Cover 2', 25.0, 15, 20, 6)
      ];

      const outliers = detector.detectOutliers(analyses)[0].outlierDetails;

      const highSeverity = detector.filterBySeverity(outliers, 'high');
      const mediumSeverity = detector.filterBySeverity(outliers, 'medium');

      expect(highSeverity.length).toBeGreaterThanOrEqual(mediumSeverity.length);
    });

    it('should generate accurate summary statistics', () => {
      const analyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Normal 1', 'Cover 2', 7.0, 15, 20, 6),
        createMockAnalysis('west-coast', 'Outlier 1', 'Cover 2', 25.0, 15, 20, 6),
        createMockAnalysis('west-coast', 'Outlier 2', 'Cover 2', 7.0, 40, 20, 6),
        createMockAnalysis('west-coast', 'Normal 2', 'Cover 2', 7.1, 15, 20, 6),
        createMockAnalysis('air-raid', 'Critical', 'Cover 4', 50.0, 60, 80, 40)
      ];

      const outlierAnalyses = detector.detectOutliers(analyses);
      const summary = detector.getOutlierSummary(outlierAnalyses);

      expect(summary.totalTables).toBe(5);
      expect(summary.tablesWithOutliers).toBeGreaterThan(0);
      expect(summary.criticalTables).toBeGreaterThan(0);
      expect(summary.mostCommonIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tables with zero values appropriately', () => {
      const zeroValueAnalyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Zero Values', 'Cover 2', 0, 0, 0, 0)
      ];

      const outliers = detector.detectOutliers(zeroValueAnalyses);

      expect(outliers.length).toBe(1);
      // Should not crash and should handle zero values
      expect(outliers[0]).toBeDefined();
    });

    it('should handle extreme statistical values', () => {
      const extremeAnalyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Extreme Values', 'Cover 2', 1000, 100, 100, 100)
      ];

      const outliers = detector.detectOutliers(extremeAnalyses);

      expect(outliers.length).toBe(1);
      expect(outliers[0].severity).toMatch(/^(high|critical)$/);
    });
  });
});

/**
 * Helper function to create mock TableAnalysis objects
 */
function createMockAnalysis(
  playbook: string,
  offenseCard: string,
  defenseCard: string,
  avgYards: number,
  turnoverRate: number,
  explosiveRate: number,
  penaltyRate: number
): TableAnalysis {
  return {
    tableId: `${playbook}/${offenseCard.toLowerCase().replace(/\s+/g, '-')}-vs-${defenseCard.toLowerCase().replace(/\s+/g, '-')}`,
    playbook,
    offenseCard,
    defenseCard,
    sampleSize: 10000,
    avgYards,
    yardsStdDev: Math.sqrt(avgYards * 2), // Reasonable variance
    turnoverRate,
    explosiveRate,
    sackRate: 6, // Reasonable default
    penaltyRate,
    clockDistribution: { 10: 30, 20: 35, 30: 35 },
    clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.7 },
    redZoneEfficiency: 75,
    analysisTime: 100,
    memoryUsage: 1000
  };
}
