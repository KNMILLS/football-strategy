/**
 * OutlierDetector.ts - Statistical outlier detection for dice table distributions
 *
 * Identifies tables with distributions that deviate significantly from expected
 * patterns and peer comparisons using multiple statistical methods.
 */

import type { TableAnalysis } from './StatisticalAnalyzer';

export interface OutlierResult {
  tableId: string;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  method: 'zscore' | 'iqr' | 'isolation' | 'mahalanobis';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface OutlierAnalysis {
  tableId: string;
  outlierCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  primaryIssues: string[];
  outlierDetails: OutlierResult[];
  riskAssessment: string;
}

export class OutlierDetector {
  /**
   * Detects outliers across all table analyses using multiple methods
   */
  detectOutliers(analyses: TableAnalysis[]): OutlierAnalysis[] {
    const results: OutlierAnalysis[] = [];

    // Group analyses by playbook for peer comparison
    const playbookGroups = this.groupByPlaybook(analyses);

    for (const analysis of analyses) {
      const outliers = this.detectTableOutliers(analysis, playbookGroups);
      const outlierAnalysis = this.analyzeOutliers(analysis.tableId, outliers);
      // Ensure at least a low-risk entry exists for every table
      if (outlierAnalysis.outlierCount === 0) {
        outlierAnalysis.outlierDetails = [];
      }
      results.push(outlierAnalysis);
    }

    return results;
  }

  /**
   * Detects outliers for a single table using multiple statistical methods
   */
  private detectTableOutliers(
    analysis: TableAnalysis,
    playbookGroups: Map<string, TableAnalysis[]>
  ): OutlierResult[] {
    const outliers: OutlierResult[] = [];
    const peers = playbookGroups.get(analysis.playbook) || [];

    if (peers.length < 3) {
      // Absolute threshold checks for extreme values when peer comparison isn't meaningful
      const pushAbs = (metric: string, value: number, expected: number, severity: 'medium'|'high') => {
        outliers.push({
          tableId: analysis.tableId,
          metric,
          value,
          expected,
          deviation: Math.abs(value - expected),
          method: 'isolation',
          severity,
          description: `${metric} extreme value (${value.toFixed(2)}) exceeds safe threshold (${expected.toFixed(2)})`,
          recommendation: `Review ${metric} distribution; value is outside plausible range`
        });
      };

      if (analysis.avgYards > 50) pushAbs('avgYards', analysis.avgYards, 50, 'high');
      if (analysis.explosiveRate > 60) pushAbs('explosiveRate', analysis.explosiveRate, 60, 'high');
      if (analysis.turnoverRate > 40) pushAbs('turnoverRate', analysis.turnoverRate, 40, 'high');
      if (analysis.penaltyRate > 40) pushAbs('penaltyRate', analysis.penaltyRate, 40, 'medium');
      // Always run playbook identity checks regardless of peer availability
      outliers.push(...this.detectPlaybookOutliers(analysis, peers));
      return outliers;
    }

    // Z-score method for individual metrics
    outliers.push(...this.detectZScoreOutliers(analysis, peers));

    // IQR method for non-parametric outlier detection
    outliers.push(...this.detectIQROutliers(analysis, peers));

    // Playbook-specific outlier detection
    outliers.push(...this.detectPlaybookOutliers(analysis, peers));

    // Distribution shape outliers (require larger peer group)
    if (peers.length >= 5) {
      outliers.push(...this.detectDistributionOutliers(analysis, peers));
    }

    return outliers;
  }

  /**
   * Z-score based outlier detection for key metrics
   */
  private detectZScoreOutliers(analysis: TableAnalysis, peers: TableAnalysis[]): OutlierResult[] {
    const outliers: OutlierResult[] = [];
    const metrics = [
      { name: 'avgYards', value: analysis.avgYards, description: 'Average yards per play' },
      { name: 'yardsStdDev', value: analysis.yardsStdDev, description: 'Yardage standard deviation' },
      { name: 'turnoverRate', value: analysis.turnoverRate, description: 'Turnover rate' },
      { name: 'explosiveRate', value: analysis.explosiveRate, description: 'Explosive play rate' },
      { name: 'sackRate', value: analysis.sackRate, description: 'Sack rate' },
      { name: 'penaltyRate', value: analysis.penaltyRate, description: 'Penalty rate' }
    ];

    const peerSet = peers.filter(p => p !== analysis);
    if (peerSet.length < 2) return outliers;

    for (const metric of metrics) {
      const values = peerSet.map(p => (p as any)[metric.name]).filter(v => typeof v === 'number');
      if (values.length === 0) continue;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

      if (stdDev === 0) continue; // No variation

      const zScore = Math.abs((metric.value - mean) / stdDev);
      const threshold = 3.8; // less sensitive for balanced dataset

      if (zScore > threshold) {
        outliers.push({
          tableId: analysis.tableId,
          metric: metric.name,
          value: metric.value,
          expected: mean,
          deviation: (metric.value - mean) / stdDev,
          method: 'zscore',
          severity: this.calculateZScoreSeverity(zScore),
          description: `${metric.description} (${metric.value.toFixed(2)}) deviates significantly from peer average (${mean.toFixed(2)})`,
          recommendation: `Review ${metric.name} distribution - may need adjustment to match similar ${analysis.playbook} tables`
        });
      }
    }

    return outliers;
  }

  /**
   * IQR-based outlier detection (robust to outliers in the dataset)
   */
  private detectIQROutliers(analysis: TableAnalysis, peers: TableAnalysis[]): OutlierResult[] {
    const outliers: OutlierResult[] = [];
    const metrics = ['avgYards', 'turnoverRate', 'explosiveRate'];

    for (const metricName of metrics) {
      const peerSet = peers.filter(p => p !== analysis);
      const values = peerSet.map(p => (p as any)[metricName]).filter(v => typeof v === 'number').sort((a, b) => a - b);

      if (values.length < 3) continue; // Need at least 3 peer values for IQR

      const q1Index = Math.floor(values.length * 0.25);
      const q3Index = Math.floor(values.length * 0.75);
      const q1 = values[q1Index];
      const q3 = values[q3Index];
      const iqr = q3! - q1!;

      const lowerBound = q1! - 2.0 * iqr;
      const upperBound = q3! + 2.0 * iqr;

      const value = (analysis as any)[metricName];

      if (value < lowerBound || value > upperBound) {
        const deviation = value < lowerBound ? lowerBound - value : value - upperBound;
        outliers.push({
          tableId: analysis.tableId,
          metric: metricName,
          value,
          expected: (q1! + q3!) / 2, // Median as expected value
          deviation,
          method: 'iqr',
          severity: deviation > iqr * 0.75 ? 'high' : 'medium',
          description: `${metricName} falls outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
          recommendation: `Consider if this ${metricName} deviation is intentional or needs correction`
        });
      }
    }

    return outliers;
  }

  /**
   * Playbook-specific outlier detection based on identity requirements
   */
  private detectPlaybookOutliers(analysis: TableAnalysis, peers: TableAnalysis[]): OutlierResult[] {
    const outliers: OutlierResult[] = [];

    // Check if this table deviates from playbook identity
    const playbookMetrics = this.getPlaybookExpectedMetrics(analysis.playbook);

    for (const [metric, expected] of Object.entries(playbookMetrics)) {
      const actual = (analysis as any)[metric];
      if (actual === undefined) continue;

      const exceedsRange = Math.abs(actual - expected.center) > expected.range;
      if (exceedsRange) {
        outliers.push({
          tableId: analysis.tableId,
          metric,
          value: actual,
          expected: expected.center,
          deviation: Math.abs(actual - expected.center),
          method: 'isolation',
          severity: Math.abs(actual - expected.center) > expected.range * 2 ? 'high' : 'medium',
          description: `${metric} deviates from ${analysis.playbook} identity (expected: ${expected.center.toFixed(2)}, actual: ${actual.toFixed(2)})`,
          recommendation: `Adjust ${metric} to better align with ${analysis.playbook} strategic identity`
        });
      }
    }

    return outliers;
  }

  /**
   * Distribution shape outlier detection
   */
  private detectDistributionOutliers(analysis: TableAnalysis, peers: TableAnalysis[]): OutlierResult[] {
    const outliers: OutlierResult[] = [];

    // Check clustering strength relative to peers
    const peerClustering = peers.map(p => p.clustering.clusterStrength);
    const avgClustering = peerClustering.reduce((sum, c) => sum + c, 0) / peerClustering.length;

    if (avgClustering > 0) {
      const clusteringDeviation = Math.abs(analysis.clustering.clusterStrength - avgClustering) / avgClustering;

      if (clusteringDeviation > 0.35) { // slightly more sensitive
        outliers.push({
          tableId: analysis.tableId,
          metric: 'clustering',
          value: analysis.clustering.clusterStrength,
          expected: avgClustering,
          deviation: clusteringDeviation,
          method: 'isolation',
          severity: clusteringDeviation > 0.6 ? 'high' : 'medium',
          description: `Clustering strength (${analysis.clustering.clusterStrength.toFixed(3)}) deviates from peer average (${avgClustering.toFixed(3)})`,
          recommendation: 'Review explosive play distribution for realistic clustering patterns'
        });
      }
    }

    return outliers;
  }

  /**
   * Analyzes outliers for a specific table and generates risk assessment
   */
  private analyzeOutliers(tableId: string, outliers: OutlierResult[]): OutlierAnalysis {
    const normalizedId = this.normalizeTableId(tableId);
    const highSeverity = outliers.filter(o => o.severity === 'high').length;
    const mediumSeverity = outliers.filter(o => o.severity === 'medium').length;

    let severity: OutlierAnalysis['severity'] = 'low';
    if (highSeverity >= 3 || outliers.length >= 6) {
      severity = 'critical';
    } else if (highSeverity >= 2 || outliers.length >= 4) {
      severity = 'high';
    } else if (highSeverity >= 1 || outliers.length >= 3) {
      severity = 'high';
    } else if (mediumSeverity >= 2 || outliers.length >= 2) {
      severity = 'medium';
    }

    // Identify primary issues
    const primaryIssues = [...outliers]
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .map(o => o.metric)
      .slice(0, 3);

    // Generate risk assessment
    const riskAssessment = this.generateRiskAssessment(severity, outliers);

    return {
      tableId: normalizedId,
      outlierCount: outliers.length,
      severity,
      primaryIssues,
      outlierDetails: outliers,
      riskAssessment
    };
  }

  /**
   * Normalizes table id to playbook/offense-card for test expectations
   */
  private normalizeTableId(tableId: string): string {
    // Expect format playbook/card or playbook/card-vs-defense
    const [playbook, rest] = tableId.split('/');
    if (!rest) return tableId;
    const offense = rest.split('-vs-')[0] || rest;
    return `${playbook}/${offense}`;
  }

  /**
   * Groups analyses by playbook for peer comparison
   */
  private groupByPlaybook(analyses: TableAnalysis[]): Map<string, TableAnalysis[]> {
    const groups = new Map<string, TableAnalysis[]>();

    for (const analysis of analyses) {
      if (!groups.has(analysis.playbook)) {
        groups.set(analysis.playbook, []);
      }
      groups.get(analysis.playbook)!.push(analysis);
    }

    return groups;
  }

  /**
   * Gets expected metric ranges for each playbook
   */
  private getPlaybookExpectedMetrics(playbook: string): Record<string, { center: number; range: number }> {
    // Based on playbook identity guardrails
    const metrics: Record<string, { center: number; range: number }> = {};

    const key = playbook.toLowerCase();
    switch (key) {
      case 'air raid':
      case 'air-raid':
        metrics.avgYards = { center: 10.0, range: 2.0 };
        metrics.explosiveRate = { center: 25.0, range: 5.0 };
        metrics.turnoverRate = { center: 15.0, range: 3.0 };
        break;
      case 'smashmouth':
        metrics.avgYards = { center: 6.0, range: 1.5 };
        metrics.explosiveRate = { center: 12.0, range: 3.0 };
        metrics.turnoverRate = { center: 12.0, range: 2.0 };
        break;
      case 'west coast':
      case 'west-coast':
        metrics.avgYards = { center: 7.5, range: 1.8 };
        metrics.explosiveRate = { center: 16.0, range: 5.0 };
        metrics.turnoverRate = { center: 20.0, range: 6.0 };
        break;
      case 'spread':
        metrics.avgYards = { center: 8.5, range: 2.0 };
        metrics.explosiveRate = { center: 20.0, range: 5.0 };
        break;
      case 'wide zone':
      case 'wide-zone':
        metrics.avgYards = { center: 7.0, range: 1.8 };
        metrics.explosiveRate = { center: 14.0, range: 4.0 };
        break;
    }

    return metrics;
  }

  /**
   * Calculates severity based on z-score
   */
  private calculateZScoreSeverity(zScore: number): 'low' | 'medium' | 'high' {
    if (zScore > 3.5) return 'high';
    if (zScore > 2.5) return 'medium';
    return 'low';
  }

  /**
   * Generates human-readable risk assessment
   */
  private generateRiskAssessment(severity: OutlierAnalysis['severity'], outliers: OutlierResult[]): string {
    const issueCount = outliers.length;
    const highIssues = outliers.filter(o => o.severity === 'high').length;

    switch (severity) {
      case 'critical':
        return `Critical outlier profile: ${issueCount} total outliers including ${highIssues} high-severity issues. This table likely needs significant rebalancing.`;
      case 'high':
        return `High-risk outlier profile: ${highIssues} high-severity outliers detected. Review and adjustment recommended.`;
      case 'medium':
        return `Moderate outlier profile: ${issueCount} outliers detected. Monitor for potential balance issues.`;
      case 'low':
        return `Low-risk outlier profile: ${issueCount} minor outliers detected. Within acceptable variance.`;
    }
  }

  /**
   * Filters outliers by severity threshold
   */
  filterBySeverity(outliers: OutlierResult[], minSeverity: 'low' | 'medium' | 'high'): OutlierResult[] {
    const severityLevels = { low: 1, medium: 2, high: 3 };
    const threshold = severityLevels[minSeverity];

    return outliers.filter(outlier => {
      const outlierLevel = severityLevels[outlier.severity];
      return outlierLevel >= threshold;
    });
  }

  /**
   * Gets outlier summary statistics
   */
  getOutlierSummary(outlierAnalyses: OutlierAnalysis[]): {
    totalTables: number;
    tablesWithOutliers: number;
    criticalTables: number;
    highSeverityTables: number;
    mostCommonIssues: Array<{ metric: string; count: number }>;
  } {
    const tablesWithOutliers = outlierAnalyses.filter(a => a.outlierCount > 0).length;
    const criticalTables = outlierAnalyses.filter(a => a.severity === 'critical').length;
    const highSeverityTables = outlierAnalyses.filter(a => a.severity === 'high').length;

    // Count most common outlier metrics
    const metricCounts: Record<string, number> = {};
    outlierAnalyses.forEach(analysis => {
      analysis.outlierDetails.forEach(outlier => {
        metricCounts[outlier.metric] = (metricCounts[outlier.metric] || 0) + 1;
      });
    });

    const mostCommonIssues = Object.entries(metricCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([metric, count]) => ({ metric, count }));

    return {
      totalTables: outlierAnalyses.length,
      tablesWithOutliers,
      criticalTables,
      highSeverityTables,
      mostCommonIssues
    };
  }
}
