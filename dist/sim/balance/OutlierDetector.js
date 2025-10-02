/**
 * OutlierDetector.ts - Statistical outlier detection for dice table distributions
 *
 * Identifies tables with distributions that deviate significantly from expected
 * patterns and peer comparisons using multiple statistical methods.
 */
import { STATISTICAL_THRESHOLDS } from './Guardrails';
export class OutlierDetector {
    /**
     * Detects outliers across all table analyses using multiple methods
     */
    detectOutliers(analyses) {
        const results = [];
        // Group analyses by playbook for peer comparison
        const playbookGroups = this.groupByPlaybook(analyses);
        for (const analysis of analyses) {
            const outliers = this.detectTableOutliers(analysis, playbookGroups);
            const outlierAnalysis = this.analyzeOutliers(analysis.tableId, outliers);
            results.push(outlierAnalysis);
        }
        return results;
    }
    /**
     * Detects outliers for a single table using multiple statistical methods
     */
    detectTableOutliers(analysis, playbookGroups) {
        const outliers = [];
        const peers = playbookGroups.get(analysis.playbook) || [];
        if (peers.length < 3) {
            // Not enough peers for meaningful comparison
            return outliers;
        }
        // Z-score method for individual metrics
        outliers.push(...this.detectZScoreOutliers(analysis, peers));
        // IQR method for non-parametric outlier detection
        outliers.push(...this.detectIQROutliers(analysis, peers));
        // Playbook-specific outlier detection
        outliers.push(...this.detectPlaybookOutliers(analysis, peers));
        // Distribution shape outliers
        outliers.push(...this.detectDistributionOutliers(analysis, peers));
        return outliers;
    }
    /**
     * Z-score based outlier detection for key metrics
     */
    detectZScoreOutliers(analysis, peers) {
        const outliers = [];
        const metrics = [
            { name: 'avgYards', value: analysis.avgYards, description: 'Average yards per play' },
            { name: 'yardsStdDev', value: analysis.yardsStdDev, description: 'Yardage standard deviation' },
            { name: 'turnoverRate', value: analysis.turnoverRate, description: 'Turnover rate' },
            { name: 'explosiveRate', value: analysis.explosiveRate, description: 'Explosive play rate' },
            { name: 'sackRate', value: analysis.sackRate, description: 'Sack rate' },
            { name: 'penaltyRate', value: analysis.penaltyRate, description: 'Penalty rate' }
        ];
        for (const metric of metrics) {
            const values = peers.map(p => p[metric.name]).filter(v => typeof v === 'number');
            if (values.length === 0)
                continue;
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
            if (stdDev === 0)
                continue; // No variation
            const zScore = Math.abs((metric.value - mean) / stdDev);
            const threshold = 2.5; // 2.5 standard deviations for outlier detection
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
    detectIQROutliers(analysis, peers) {
        const outliers = [];
        const metrics = ['avgYards', 'turnoverRate', 'explosiveRate'];
        for (const metricName of metrics) {
            const values = peers.map(p => p[metricName]).filter(v => typeof v === 'number').sort((a, b) => a - b);
            if (values.length < 4)
                continue; // Need at least 4 values for IQR
            const q1Index = Math.floor(values.length * 0.25);
            const q3Index = Math.floor(values.length * 0.75);
            const q1 = values[q1Index];
            const q3 = values[q3Index];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            const value = analysis[metricName];
            if (value < lowerBound || value > upperBound) {
                const deviation = value < lowerBound ? lowerBound - value : value - upperBound;
                outliers.push({
                    tableId: analysis.tableId,
                    metric: metricName,
                    value,
                    expected: (q1 + q3) / 2, // Median as expected value
                    deviation,
                    method: 'iqr',
                    severity: deviation > iqr ? 'high' : 'medium',
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
    detectPlaybookOutliers(analysis, peers) {
        const outliers = [];
        // Check if this table deviates from playbook identity
        const playbookMetrics = this.getPlaybookExpectedMetrics(analysis.playbook);
        for (const [metric, expected] of Object.entries(playbookMetrics)) {
            const actual = analysis[metric];
            if (actual === undefined)
                continue;
            const deviation = Math.abs(actual - expected.center) / expected.center;
            const threshold = 0.3; // 30% deviation threshold
            if (deviation > threshold) {
                outliers.push({
                    tableId: analysis.tableId,
                    metric,
                    value: actual,
                    expected: expected.center,
                    deviation,
                    method: 'isolation',
                    severity: deviation > 0.5 ? 'high' : 'medium',
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
    detectDistributionOutliers(analysis, peers) {
        const outliers = [];
        // Check clustering strength relative to peers
        const peerClustering = peers.map(p => p.clustering.clusterStrength);
        const avgClustering = peerClustering.reduce((sum, c) => sum + c, 0) / peerClustering.length;
        if (avgClustering > 0) {
            const clusteringDeviation = Math.abs(analysis.clustering.clusterStrength - avgClustering) / avgClustering;
            if (clusteringDeviation > 0.4) { // 40% deviation in clustering
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
    analyzeOutliers(tableId, outliers) {
        const highSeverity = outliers.filter(o => o.severity === 'high').length;
        const mediumSeverity = outliers.filter(o => o.severity === 'medium').length;
        let severity = 'low';
        if (highSeverity >= 3 || outliers.length >= 6) {
            severity = 'critical';
        }
        else if (highSeverity >= 1 || outliers.length >= 4) {
            severity = 'high';
        }
        else if (mediumSeverity >= 2 || outliers.length >= 2) {
            severity = 'medium';
        }
        // Identify primary issues
        const primaryIssues = outliers
            .filter(o => o.severity === 'high')
            .map(o => o.metric)
            .slice(0, 3); // Top 3 issues
        // Generate risk assessment
        const riskAssessment = this.generateRiskAssessment(severity, outliers);
        return {
            tableId,
            outlierCount: outliers.length,
            severity,
            primaryIssues,
            outlierDetails: outliers,
            riskAssessment
        };
    }
    /**
     * Groups analyses by playbook for peer comparison
     */
    groupByPlaybook(analyses) {
        const groups = new Map();
        for (const analysis of analyses) {
            if (!groups.has(analysis.playbook)) {
                groups.set(analysis.playbook, []);
            }
            groups.get(analysis.playbook).push(analysis);
        }
        return groups;
    }
    /**
     * Gets expected metric ranges for each playbook
     */
    getPlaybookExpectedMetrics(playbook) {
        // Based on playbook identity guardrails
        const metrics = {};
        switch (playbook) {
            case 'Air Raid':
                metrics.avgYards = { center: 10.0, range: 2.0 };
                metrics.explosiveRate = { center: 25.0, range: 5.0 };
                metrics.turnoverRate = { center: 15.0, range: 3.0 };
                break;
            case 'Smashmouth':
                metrics.avgYards = { center: 6.0, range: 1.5 };
                metrics.explosiveRate = { center: 12.0, range: 3.0 };
                metrics.turnoverRate = { center: 12.0, range: 2.0 };
                break;
            case 'West Coast':
                metrics.avgYards = { center: 7.5, range: 1.8 };
                metrics.explosiveRate = { center: 16.0, range: 4.0 };
                break;
            case 'Spread':
                metrics.avgYards = { center: 8.5, range: 2.0 };
                metrics.explosiveRate = { center: 20.0, range: 5.0 };
                break;
            case 'Wide Zone':
                metrics.avgYards = { center: 7.0, range: 1.8 };
                metrics.explosiveRate = { center: 14.0, range: 4.0 };
                break;
        }
        return metrics;
    }
    /**
     * Calculates severity based on z-score
     */
    calculateZScoreSeverity(zScore) {
        if (zScore > 3.5)
            return 'high';
        if (zScore > 2.5)
            return 'medium';
        return 'low';
    }
    /**
     * Generates human-readable risk assessment
     */
    generateRiskAssessment(severity, outliers) {
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
    filterBySeverity(outliers, minSeverity) {
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
    getOutlierSummary(outlierAnalyses) {
        const tablesWithOutliers = outlierAnalyses.filter(a => a.outlierCount > 0).length;
        const criticalTables = outlierAnalyses.filter(a => a.severity === 'critical').length;
        const highSeverityTables = outlierAnalyses.filter(a => a.severity === 'high').length;
        // Count most common outlier metrics
        const metricCounts = {};
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
//# sourceMappingURL=OutlierDetector.js.map