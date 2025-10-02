/**
 * ReportGenerator.test.ts - Tests for comprehensive balance report generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportGenerator } from '../../../src/sim/balance/ReportGenerator';
import type { TableAnalysis } from '../../../src/sim/balance/StatisticalAnalyzer';
import type { ComplianceResult } from '../../../src/sim/balance/GuardrailChecker';
import type { OutlierAnalysis } from '../../../src/sim/balance/OutlierDetector';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  describe('Report Generation', () => {
    it('should generate complete balance report', () => {
      const analyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Curl', 'Cover 2', 7.0, 15, 20, 12),
        createMockAnalysis('air-raid', 'Four Verts', 'Cover 4', 10.0, 18, 28, 13)
      ];

      const compliance: ComplianceResult[] = [
        createMockCompliance('west-coast/curl-vs-cover-2', 'compliant', 95),
        createMockCompliance('air-raid/four-verts-vs-cover-4', 'warning', 75)
      ];

      const outliers: OutlierAnalysis[] = [
        createMockOutliers('west-coast/curl-vs-cover-2', 0, 'low'),
        createMockOutliers('air-raid/four-verts-vs-cover-4', 2, 'medium')
      ];

      const report = generator.generateReport(analyses, compliance, outliers, 1500, {
        sampleSize: 10000,
        seed: 12345
      });

      // Verify metadata
      expect(report.metadata.generatedAt).toBeDefined();
      expect(report.metadata.analysisVersion).toBe('1.0.0');
      expect(report.metadata.sampleSize).toBe(10000);
      expect(report.metadata.seed).toBe(12345);
      expect(report.metadata.totalTables).toBe(2);
      expect(report.metadata.analysisDuration).toBe(1500);

      // Verify summary
      expect(report.summary.tablesAnalyzed).toBe(2);
      expect(report.summary.compliantTables).toBe(1);
      expect(report.summary.tablesWithWarnings).toBe(1);
      expect(report.summary.averageScore).toBe(85);

      // Verify detailed results
      expect(report.detailedResults).toHaveLength(2);
      expect(report.detailedResults[0].tableId).toBe('west-coast/curl-vs-cover-2');
      expect(report.detailedResults[1].tableId).toBe('air-raid/four-verts-vs-cover-4');
    });

    it('should handle empty datasets', () => {
      const report = generator.generateReport([], [], [], 0, {
        sampleSize: 10000,
        seed: 12345
      });

      expect(report.metadata.totalTables).toBe(0);
      expect(report.summary.tablesAnalyzed).toBe(0);
      expect(report.summary.compliantTables).toBe(0);
      expect(report.detailedResults).toHaveLength(0);
    });

    it('should generate appropriate health assessments', () => {
      // Test excellent health (high scores, no critical issues)
      const excellentReport = generator.generateReport(
        [createMockAnalysis('west-coast', 'Good Play', 'Cover 2', 7.0, 15, 20, 12)],
        [createMockCompliance('test/good', 'compliant', 95)],
        [createMockOutliers('test/good', 0, 'low')],
        1000,
        { sampleSize: 10000, seed: 12345 }
      );

      expect(excellentReport.summary.overallHealth).toBe('excellent');

      // Test critical health (low scores, critical violations)
      const criticalReport = generator.generateReport(
        [createMockAnalysis('west-coast', 'Bad Play', 'Cover 2', 7.0, 15, 20, 12)],
        [createMockCompliance('test/bad', 'critical', 30)],
        [createMockOutliers('test/bad', 5, 'critical')],
        1000,
        { sampleSize: 10000, seed: 12345 }
      );

      expect(criticalReport.summary.overallHealth).toBe('critical');
    });
  });

  describe('Report Sections', () => {
    it('should generate compliance section correctly', () => {
      const analyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'WC1', 'Cover 2', 7.0, 15, 20, 12),
        createMockAnalysis('west-coast', 'WC2', 'Cover 2', 7.1, 16, 19, 13),
        createMockAnalysis('air-raid', 'AR1', 'Cover 4', 10.0, 18, 28, 13)
      ];

      const compliance: ComplianceResult[] = [
        createMockCompliance('west-coast/wc1-vs-cover-2', 'compliant', 95),
        createMockCompliance('west-coast/wc2-vs-cover-2', 'warning', 80),
        createMockCompliance('air-raid/ar1-vs-cover-4', 'violation', 60)
      ];

      const report = generator.generateReport(analyses, compliance, [], 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      // Should group by playbook
      expect(report.compliance.byPlaybook['west-coast']).toBeDefined();
      expect(report.compliance.byPlaybook['air-raid']).toBeDefined();

      // Should identify top issues
      expect(report.compliance.topIssues.length).toBeGreaterThan(0);

      // Should include trends
      expect(report.compliance.trends.length).toBeGreaterThan(0);
    });

    it('should generate outliers section correctly', () => {
      const outliers: OutlierAnalysis[] = [
        createMockOutliers('west-coast/normal', 0, 'low'),
        createMockOutliers('west-coast/outlier1', 3, 'high'),
        createMockOutliers('air-raid/outlier2', 1, 'medium'),
        createMockOutliers('smashmouth/outlier3', 5, 'critical')
      ];

      const report = generator.generateReport([], [], outliers, 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      expect(report.outliers.summary.tablesWithOutliers).toBe(3);
      expect(report.outliers.summary.criticalOutliers).toBe(1);
      expect(report.outliers.summary.highSeverityOutliers).toBe(1);

      // Should group by playbook
      expect(report.outliers.byPlaybook['west-coast']).toBeDefined();
      expect(report.outliers.byPlaybook['air-raid']).toBeDefined();
      expect(report.outliers.byPlaybook['smashmouth']).toBeDefined();

      // Should provide recommendations
      expect(report.outliers.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate recommendations section', () => {
      const compliance: ComplianceResult[] = [
        createMockCompliance('test/critical1', 'critical', 20),
        createMockCompliance('test/critical2', 'critical', 25),
        createMockCompliance('test/high1', 'violation', 50),
        createMockCompliance('test/high2', 'violation', 55)
      ];

      const outliers: OutlierAnalysis[] = [
        createMockOutliers('test/outlier1', 3, 'high'),
        createMockOutliers('test/outlier2', 5, 'critical')
      ];

      const report = generator.generateReport([], compliance, outliers, 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      expect(report.recommendations.priority.length).toBeGreaterThan(0);

      // Should have critical recommendations first
      const criticalRecs = report.recommendations.priority.filter(r => r.level === 'critical');
      expect(criticalRecs.length).toBeGreaterThan(0);

      // Should have quick wins
      expect(report.recommendations.quickWins.length).toBeGreaterThan(0);
    });
  });

  describe('Report Export', () => {
    it('should export to JSON format', () => {
      const report = generator.generateReport([], [], [], 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      const jsonExport = generator.exportToJSON(report);

      expect(() => JSON.parse(jsonExport)).not.toThrow();
      expect(jsonExport).toContain('metadata');
      expect(jsonExport).toContain('summary');
      expect(jsonExport).toContain('compliance');
    });

    it('should export to text format', () => {
      const report = generator.generateReport([], [], [], 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      const textExport = generator.exportToText(report);

      expect(textExport).toContain('Gridiron Strategy - Balance Analysis Report');
      expect(textExport).toContain('Generated:');
      expect(textExport).toContain('Summary');
      expect(textExport).toContain('Overall Health:');
    });

    it('should format text report with proper sections', () => {
      const analyses: TableAnalysis[] = [
        createMockAnalysis('west-coast', 'Test Play', 'Cover 2', 7.0, 15, 20, 12)
      ];

      const compliance: ComplianceResult[] = [
        createMockCompliance('test/play', 'compliant', 95)
      ];

      const outliers: OutlierAnalysis[] = [
        createMockOutliers('test/play', 0, 'low')
      ];

      const report = generator.generateReport(analyses, compliance, outliers, 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      const textReport = generator.exportToText(report);

      expect(textReport).toContain('Overall Health: EXCELLENT');
      expect(textReport).toContain('Compliance Score: 95.0/100');
      expect(textReport).toContain('Tables Analyzed: 1');
      expect(textReport).toContain('Compliant: 1 tables');
    });
  });

  describe('Appendices', () => {
    it('should include guardrail definitions', () => {
      const report = generator.generateReport([], [], [], 1000, {
        sampleSize: 10000,
        seed: 12345
      });

      expect(report.appendices.guardrailDefinitions).toBeDefined();
      expect(report.appendices.guardrailDefinitions['explosivePassRate']).toBeDefined();
      expect(report.appendices.methodology).toBeDefined();
      expect(report.appendices.statisticalNotes.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper functions to create mock data
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
    yardsStdDev: Math.sqrt(avgYards * 2),
    turnoverRate,
    explosiveRate,
    sackRate: 6,
    penaltyRate,
    clockDistribution: { 10: 30, 20: 35, 30: 35 },
    clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.7 },
    redZoneEfficiency: 75,
    analysisTime: 100,
    memoryUsage: 1000
  };
}

function createMockCompliance(tableId: string, overall: ComplianceResult['overall'], score: number): ComplianceResult {
  return {
    tableId,
    overall,
    violations: [],
    warnings: [],
    score,
    summary: `Table ${overall} with score ${score}/100`
  };
}

function createMockOutliers(tableId: string, count: number, severity: OutlierAnalysis['severity']): OutlierAnalysis {
  return {
    tableId,
    outlierCount: count,
    severity,
    primaryIssues: count > 0 ? ['avgYards', 'turnoverRate'] : [],
    outlierDetails: [],
    riskAssessment: `${severity} risk with ${count} outliers`
  };
}
