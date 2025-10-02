/**
 * GuardrailChecker.ts - GDD compliance validation for dice table distributions
 *
 * Validates that statistical analysis results meet GDD guardrail requirements
 * and provides detailed compliance reports with actionable recommendations.
 */
import { BALANCE_GUARDRAILS, PLAYBOOK_IDENTITY_GUARDRAILS, DISTRIBUTION_GUARDRAILS, STATISTICAL_THRESHOLDS } from './Guardrails';
export class GuardrailChecker {
    /**
     * Checks a single table analysis against all applicable guardrails
     */
    checkCompliance(analysis) {
        const violations = [];
        const warnings = [];
        // Check balance guardrails
        this.checkBalanceGuardrails(analysis, violations, warnings);
        // Check playbook identity guardrails
        this.checkPlaybookIdentity(analysis, violations, warnings);
        // Check distribution shape guardrails
        this.checkDistributionShape(analysis, violations, warnings);
        // Calculate overall compliance
        const result = this.calculateOverallCompliance(analysis.tableId, violations, warnings);
        return result;
    }
    /**
     * Checks core balance metrics against NFL analytics guardrails
     */
    checkBalanceGuardrails(analysis, violations, warnings) {
        // Explosive pass rate (15-25%)
        this.checkGuardrail('explosivePassRate', analysis.explosiveRate, BALANCE_GUARDRAILS.explosivePassRate, analysis, violations, warnings, 'Explosive pass rate significantly impacts scoring balance');
        // Sack rate (4-8%)
        this.checkGuardrail('sackRate', analysis.sackRate, BALANCE_GUARDRAILS.sackRate, analysis, violations, warnings, 'Sack rate affects defensive effectiveness and game flow');
        // Turnover rate (10-20%)
        this.checkGuardrail('turnoverRate', analysis.turnoverRate, BALANCE_GUARDRAILS.turnoverRate, analysis, violations, warnings, 'Turnover rate dramatically affects possession balance');
        // Penalty rate (8-15%)
        this.checkGuardrail('penaltyRate', analysis.penaltyRate, BALANCE_GUARDRAILS.penaltyRate, analysis, violations, warnings, 'Penalty rate affects game flow and strategic decision-making');
        // Clock runoff balance (25-40% each)
        this.checkClockBalance(analysis, violations, warnings);
        // Red zone efficiency (70-85%)
        this.checkGuardrail('redZoneEfficiency', analysis.redZoneEfficiency, BALANCE_GUARDRAILS.redZoneEfficiency, analysis, violations, warnings, 'Red zone efficiency affects scoring balance in critical situations');
    }
    /**
     * Checks playbook-specific identity requirements
     */
    checkPlaybookIdentity(analysis, violations, warnings) {
        const identity = PLAYBOOK_IDENTITY_GUARDRAILS[analysis.playbook];
        if (!identity)
            return;
        // Pass rate check (playbook specific)
        const passRate = 100 - (analysis.explosiveRate * 0.3); // Rough estimate based on play types
        this.checkRange(`playbookPassRate_${analysis.playbook}`, passRate, identity.passRate, violations, warnings, `Playbook pass rate affects ${analysis.playbook} strategic identity`, `Adjust play mix to better reflect ${analysis.playbook} philosophy`);
        // Average gain check
        this.checkRange(`playbookAvgGain_${analysis.playbook}`, analysis.avgYards, identity.avgGain, violations, warnings, `Average gain should match ${analysis.playbook} offensive efficiency`, `Tune yardage distributions to match ${analysis.playbook} style`);
        // Explosive rate check (playbook specific)
        this.checkRange(`playbookExplosiveRate_${analysis.playbook}`, analysis.explosiveRate, identity.explosiveRate, violations, warnings, `Explosive play rate should match ${analysis.playbook} risk profile`, `Adjust explosive thresholds to match ${analysis.playbook} identity`);
    }
    /**
     * Checks distribution shape requirements (clustering, volatility, etc.)
     */
    checkDistributionShape(analysis, violations, warnings) {
        // Explosive clustering check
        if (analysis.clustering.clusterStrength < 0.3) {
            warnings.push({
                guardrail: 'explosiveClustering',
                severity: 'medium',
                actual: analysis.clustering.clusterStrength,
                expected: { min: 0.3, max: 1.0 },
                deviation: 0.3 - analysis.clustering.clusterStrength,
                description: 'Explosive outcomes lack realistic clustering patterns',
                recommendation: 'Redistribute explosive gains to cluster around key thresholds (20, 25, 30, etc.)'
            });
        }
        // Run game consistency check
        const isRunPlaybook = ['Smashmouth', 'Wide Zone'].includes(analysis.playbook);
        if (isRunPlaybook && analysis.yardsStdDev > DISTRIBUTION_GUARDRAILS.runConsistency.stdDev.max) {
            violations.push({
                guardrail: 'runConsistency',
                severity: 'high',
                actual: analysis.yardsStdDev,
                expected: DISTRIBUTION_GUARDRAILS.runConsistency.stdDev,
                deviation: analysis.yardsStdDev - DISTRIBUTION_GUARDRAILS.runConsistency.stdDev.max,
                description: 'Run game shows unrealistic volatility for ground-based attack',
                recommendation: 'Reduce variance in run play outcomes to improve consistency'
            });
        }
        // Pass game volatility check (should be more volatile than runs)
        const isPassPlaybook = ['Air Raid', 'Spread', 'West Coast'].includes(analysis.playbook);
        if (isPassPlaybook && analysis.yardsStdDev < 8.0) {
            warnings.push({
                guardrail: 'passVolatility',
                severity: 'medium',
                actual: analysis.yardsStdDev,
                expected: { min: 8.0, max: 15.0 },
                deviation: 8.0 - analysis.yardsStdDev,
                description: 'Pass game lacks expected boom-bust volatility',
                recommendation: 'Increase variance in pass outcomes to create more dramatic plays'
            });
        }
    }
    /**
     * Checks clock runoff distribution balance
     */
    checkClockBalance(analysis, violations, warnings) {
        const { 10: clock10, 20: clock20, 30: clock30 } = analysis.clockDistribution;
        // Each clock value should be reasonably balanced (25-40%)
        [clock10, clock20, clock30].forEach((rate, index) => {
            const clockValue = [10, 20, 30][index];
            if (rate < 20 || rate > 45) {
                const severity = rate < 15 || rate > 50 ? 'high' : 'medium';
                const target = severity === 'high' ? violations : warnings;
                target.push({
                    guardrail: `clockBalance_${clockValue}`,
                    severity,
                    actual: rate,
                    expected: { min: 20, max: 45 },
                    deviation: rate < 20 ? 20 - rate : rate - 45,
                    description: `${clockValue}-second clock runoff rate is ${rate.toFixed(1)}%, outside balanced range`,
                    recommendation: `Redistribute clock runoff to achieve 25-40% distribution across 10"/20"/30"`
                });
            }
        });
    }
    /**
     * Generic guardrail checking with severity assessment
     */
    checkGuardrail(guardrailName, actual, guardrail, analysis, violations, warnings, context) {
        const { min, max } = guardrail;
        if (actual < min) {
            const deviation = min - actual;
            const severity = deviation > (max - min) * 0.5 ? 'high' : 'medium';
            (severity === 'high' ? violations : warnings).push({
                guardrail: guardrailName,
                severity,
                actual,
                expected: { min, max },
                deviation: -deviation,
                description: `${guardrail.name} is ${actual.toFixed(1)}%, below minimum ${min}% (${context})`,
                recommendation: `Increase ${guardrail.name.toLowerCase()} by adjusting outcome distributions`
            });
        }
        else if (actual > max) {
            const deviation = actual - max;
            const severity = deviation > (max - min) * 0.5 ? 'high' : 'medium';
            (severity === 'high' ? violations : warnings).push({
                guardrail: guardrailName,
                severity,
                actual,
                expected: { min, max },
                deviation,
                description: `${guardrail.name} is ${actual.toFixed(1)}%, above maximum ${max}% (${context})`,
                recommendation: `Decrease ${guardrail.name.toLowerCase()} by adjusting outcome distributions`
            });
        }
    }
    /**
     * Generic range checking helper
     */
    checkRange(name, actual, expected, violations, warnings, description, recommendation) {
        const { min, max } = expected;
        const deviation = actual < min ? min - actual : actual > max ? actual - max : 0;
        if (deviation === 0)
            return;
        const severity = Math.abs(deviation) > (max - min) * 0.3 ? 'high' : 'medium';
        (severity === 'high' ? violations : warnings).push({
            guardrail: name,
            severity,
            actual,
            expected: { min, max },
            deviation,
            description,
            recommendation
        });
    }
    /**
     * Calculates overall compliance score and status
     */
    calculateOverallCompliance(tableId, violations, warnings) {
        // Weight violations by severity
        const criticalCount = violations.filter(v => v.severity === 'critical').length;
        const highCount = violations.filter(v => v.severity === 'high').length;
        const mediumCount = violations.filter(v => v.severity === 'medium').length + warnings.length;
        // Calculate score (0-100)
        let score = 100;
        score -= criticalCount * 25; // Critical violations heavily penalize
        score -= highCount * 15; // High violations moderately penalize
        score -= mediumCount * 5; // Medium issues and warnings slightly penalize
        score = Math.max(0, score);
        // Determine overall status
        let overall;
        if (criticalCount > 0) {
            overall = 'critical';
        }
        else if (highCount > 2 || score < 60) {
            overall = 'violation';
        }
        else if (mediumCount > 3 || score < 80) {
            overall = 'warning';
        }
        else {
            overall = 'compliant';
        }
        // Generate summary
        const summary = this.generateSummary(overall, violations, warnings, score);
        return {
            tableId,
            overall,
            violations,
            warnings,
            score,
            summary
        };
    }
    /**
     * Generates a human-readable compliance summary
     */
    generateSummary(overall, violations, warnings, score) {
        const criticalCount = violations.filter(v => v.severity === 'critical').length;
        const highCount = violations.filter(v => v.severity === 'high').length;
        const issueCount = violations.length + warnings.length;
        if (overall === 'compliant') {
            return `Table is fully compliant with all GDD guardrails (score: ${score}/100)`;
        }
        if (overall === 'critical') {
            return `Critical compliance issues detected: ${criticalCount} critical violations. Immediate attention required.`;
        }
        const issueText = issueCount === 1 ? 'issue' : 'issues';
        return `Compliance ${overall}: ${issueCount} ${issueText} detected (${highCount} high priority). Score: ${score}/100`;
    }
    /**
     * Batch compliance checking for multiple tables
     */
    async checkBatchCompliance(analyses) {
        const results = [];
        for (const analysis of analyses) {
            const result = this.checkCompliance(analysis);
            results.push(result);
        }
        return results;
    }
    /**
     * Gets all guardrails that apply to a specific playbook
     */
    getApplicableGuardrails(playbook) {
        const guardrails = [];
        // Add balance guardrails
        guardrails.push('explosivePassRate', 'sackRate', 'turnoverRate', 'penaltyRate', 'clockBalance', 'redZoneEfficiency');
        // Add playbook-specific guardrails
        if (playbook in PLAYBOOK_IDENTITY_GUARDRAILS) {
            guardrails.push(`playbookPassRate_${playbook}`, `playbookAvgGain_${playbook}`, `playbookExplosiveRate_${playbook}`);
        }
        return guardrails;
    }
}
//# sourceMappingURL=GuardrailChecker.js.map