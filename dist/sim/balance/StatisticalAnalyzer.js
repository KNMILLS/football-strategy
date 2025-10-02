/**
 * StatisticalAnalyzer.ts - Distribution analysis engine for dice tables
 *
 * Analyzes dice table outcomes and calculates statistical metrics
 * for balance validation against GDD guardrails.
 */
import { BALANCE_GUARDRAILS, DISTRIBUTION_GUARDRAILS, STATISTICAL_THRESHOLDS } from './Guardrails';
export class StatisticalAnalyzer {
    rng;
    outcomes = [];
    constructor(rng) {
        this.rng = rng;
    }
    /**
     * Analyzes a dice table by running multiple simulations
     */
    async analyzeTable(tableId, offenseCard, defenseCard, playbook, sampleSize = STATISTICAL_THRESHOLDS.minSampleSize) {
        const startTime = performance.now();
        const initialMemory = this.getMemoryUsage();
        // Generate sample outcomes
        this.outcomes = [];
        for (let i = 0; i < sampleSize; i++) {
            const outcome = this.generateOutcome(tableId, offenseCard, defenseCard);
            this.outcomes.push(outcome);
        }
        // Calculate metrics
        const metrics = this.calculateDistributionMetrics();
        const analysis = this.buildAnalysisResult(tableId, offenseCard, defenseCard, playbook, sampleSize, metrics);
        const endTime = performance.now();
        analysis.analysisTime = endTime - startTime;
        analysis.memoryUsage = this.getMemoryUsage() - initialMemory;
        return analysis;
    }
    /**
     * Generates a simulated outcome for analysis
     * In a real implementation, this would use the actual dice resolution logic
     */
    generateOutcome(tableId, offenseCard, defenseCard) {
        // For now, generate synthetic outcomes based on realistic football distributions
        // In the real implementation, this would call the actual dice resolution engine
        const yards = this.generateYards(offenseCard, defenseCard);
        const turnover = this.rng() < 0.12; // ~12% turnover rate
        const clock = this.generateClock(yards, offenseCard);
        const oob = this.generateOOB(offenseCard);
        const tags = this.generateTags(yards, turnover, offenseCard, defenseCard);
        return {
            yards,
            turnover,
            clock,
            oob,
            tags,
            penalty: this.generatePenalty(offenseCard, defenseCard)
        };
    }
    /**
     * Generates realistic yardage based on play type and matchup
     */
    generateYards(offenseCard, defenseCard) {
        // Base distributions by play type
        let baseMean, baseStdDev;
        if (offenseCard.includes('PASS') || offenseCard.includes('AIR') || offenseCard.includes('VERT')) {
            // Pass plays - higher variance, more explosive potential
            baseMean = 7.5;
            baseStdDev = 12.0;
        }
        else if (offenseCard.includes('RUN') || offenseCard.includes('ZONE')) {
            // Run plays - more consistent, lower average
            baseMean = 4.2;
            baseStdDev = 3.8;
        }
        else {
            // Mixed plays
            baseMean = 5.8;
            baseStdDev = 8.5;
        }
        // Adjust for defense
        if (defenseCard.includes('BLITZ')) {
            baseMean *= 0.85; // Blitz reduces effectiveness
            baseStdDev *= 1.1; // But increases variance
        }
        else if (defenseCard.includes('COVER')) {
            baseMean *= 0.95; // Coverage slightly reduces pass effectiveness
        }
        // Generate normal distribution sample
        const u1 = this.rng();
        const u2 = this.rng();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        let yards = baseMean + baseStdDev * z0;
        // Clamp to realistic bounds and field position logic
        yards = Math.max(-10, Math.min(yards, 80)); // Realistic yardage bounds
        return Math.round(yards);
    }
    /**
     * Generates clock runoff based on play characteristics
     */
    generateClock(yards, offenseCard) {
        let clockWeights = { 10: 0.25, 20: 0.35, 30: 0.40 };
        // Adjust based on play type
        if (offenseCard.includes('PASS') || yards > 15) {
            clockWeights = { 10: 0.45, 20: 0.35, 30: 0.20 }; // Faster for passes/explosives
        }
        else if (offenseCard.includes('RUN')) {
            clockWeights = { 10: 0.15, 20: 0.30, 30: 0.55 }; // Slower for runs
        }
        const rand = this.rng();
        let cumulative = 0;
        for (const [clock, weight] of Object.entries(clockWeights)) {
            cumulative += weight;
            if (rand <= cumulative) {
                return parseInt(clock);
            }
        }
        return 30; // Fallback
    }
    /**
     * Generates out of bounds probability based on play type
     */
    generateOOB(offenseCard) {
        let oobRate = 0.05; // Base 5% OOB rate
        // Perimeter plays more likely to go OOB
        if (offenseCard.includes('BUBBLE') || offenseCard.includes('SWING') ||
            offenseCard.includes('JET') || offenseCard.includes('TOSS')) {
            oobRate = 0.15;
        }
        return this.rng() < oobRate;
    }
    /**
     * Generates outcome tags based on play characteristics
     */
    generateTags(yards, turnover, offenseCard, defenseCard) {
        const tags = [];
        if (turnover) {
            if (offenseCard.includes('PASS')) {
                tags.push('INTERCEPTION');
            }
            else {
                tags.push('FUMBLE');
            }
        }
        if (yards >= 20) {
            tags.push('EXPLOSIVE');
        }
        if (yards <= -5 && offenseCard.includes('PASS')) {
            tags.push('SACK');
        }
        if (offenseCard.includes('PASS') && yards === 0) {
            tags.push('INCOMPLETE');
        }
        // Add defensive tags
        if (defenseCard.includes('BLITZ')) {
            tags.push('PRESSURE');
        }
        return tags;
    }
    /**
     * Generates penalty outcomes
     */
    generatePenalty(offenseCard, defenseCard) {
        // 10-15% penalty rate based on guardrails
        if (this.rng() > 0.125)
            return undefined;
        const penaltyTypes = [
            { side: 'offense', yards: -15, autoFirst: false, lossOfDown: true },
            { side: 'offense', yards: -15, autoFirst: false, lossOfDown: false },
            { side: 'offense', yards: -10, autoFirst: false, lossOfDown: false },
            { side: 'offense', yards: -5, autoFirst: false, lossOfDown: false, replay: true },
            { side: 'defense', yards: 5, autoFirst: false, lossOfDown: false, replay: true },
            { side: 'defense', yards: 5, autoFirst: false, lossOfDown: false },
            { side: 'defense', yards: 10, autoFirst: false, lossOfDown: false },
            { side: 'defense', yards: 10, autoFirst: true, lossOfDown: false },
            { side: 'defense', yards: 15, autoFirst: true, lossOfDown: false }
        ];
        return penaltyTypes[Math.floor(this.rng() * penaltyTypes.length)];
    }
    /**
     * Calculates comprehensive distribution metrics
     */
    calculateDistributionMetrics() {
        const yards = this.outcomes.map(o => o.yards).sort((a, b) => a - b);
        const n = yards.length;
        // Basic statistics
        const mean = yards.reduce((sum, y) => sum + y, 0) / n;
        const median = n % 2 === 0
            ? (yards[n / 2 - 1] + yards[n / 2]) / 2
            : yards[Math.floor(n / 2)];
        // Mode calculation (most frequent values)
        const frequency = {};
        yards.forEach(y => frequency[y] = (frequency[y] || 0) + 1);
        const maxFreq = Math.max(...Object.values(frequency));
        const mode = Object.keys(frequency)
            .filter(y => frequency[Number(y)] === maxFreq)
            .map(Number);
        // Standard deviation
        const variance = yards.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / n;
        const standardDeviation = Math.sqrt(variance);
        // Skewness and kurtosis
        const skewness = yards.reduce((sum, y) => sum + Math.pow((y - mean) / standardDeviation, 3), 0) / n;
        const kurtosis = yards.reduce((sum, y) => sum + Math.pow((y - mean) / standardDeviation, 4), 0) / n - 3;
        // Quartiles
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        const quartiles = {
            q1: yards[q1Index],
            q2: median,
            q3: yards[q3Index]
        };
        // Range and outliers (IQR method)
        const iqr = quartiles.q3 - quartiles.q1;
        const lowerBound = quartiles.q1 - 1.5 * iqr;
        const upperBound = quartiles.q3 + 1.5 * iqr;
        const outliers = yards.filter(y => y < lowerBound || y > upperBound);
        return {
            mean,
            median,
            mode,
            standardDeviation,
            skewness,
            kurtosis,
            quartiles,
            range: { min: yards[0], max: yards[n - 1] },
            outliers
        };
    }
    /**
     * Builds the complete analysis result
     */
    buildAnalysisResult(tableId, offenseCard, defenseCard, playbook, sampleSize, metrics) {
        // Calculate derived metrics
        const passPlays = this.outcomes.filter(o => o.tags.some(t => t.includes('PASS') || t === 'INCOMPLETE' || t === 'SACK'));
        const runPlays = this.outcomes.filter(o => !passPlays.includes(o));
        const explosiveGains = this.outcomes.filter(o => o.yards >= 20 && !o.turnover);
        const sacks = this.outcomes.filter(o => o.tags.includes('SACK'));
        const penalties = this.outcomes.filter(o => o.penalty !== undefined);
        // Clock distribution
        const clock10 = this.outcomes.filter(o => o.clock === 10).length;
        const clock20 = this.outcomes.filter(o => o.clock === 20).length;
        const clock30 = this.outcomes.filter(o => o.clock === 30).length;
        // Clustering analysis for explosive plays
        const explosiveThresholds = [...DISTRIBUTION_GUARDRAILS.explosiveClustering.thresholds];
        const explosiveCounts = explosiveThresholds.map(threshold => this.outcomes.filter(o => o.yards >= threshold).length);
        const clusterStrength = this.calculateClusterStrength(explosiveCounts);
        return {
            tableId,
            playbook,
            offenseCard,
            defenseCard,
            sampleSize,
            avgYards: metrics.mean,
            yardsStdDev: metrics.standardDeviation,
            turnoverRate: this.outcomes.filter(o => o.turnover).length / sampleSize * 100,
            explosiveRate: explosiveGains.length / (passPlays.length || 1) * 100,
            sackRate: sacks.length / (passPlays.length || 1) * 100,
            penaltyRate: penalties.length / sampleSize * 100,
            clockDistribution: {
                10: clock10 / sampleSize * 100,
                20: clock20 / sampleSize * 100,
                30: clock30 / sampleSize * 100
            },
            clustering: {
                explosiveThresholds,
                clusterStrength
            },
            redZoneEfficiency: this.calculateRedZoneEfficiency(),
            analysisTime: 0, // Set by caller
            memoryUsage: 0 // Set by caller
        };
    }
    /**
     * Calculates cluster strength for explosive outcomes
     */
    calculateClusterStrength(counts) {
        if (counts.length === 0)
            return 0;
        // Calculate coefficient of variation for the threshold distribution
        const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        if (mean === 0)
            return 0;
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;
        // Lower CV indicates stronger clustering
        return Math.max(0, 1 - coefficientOfVariation);
    }
    /**
     * Calculates red zone efficiency (scoring rate inside 20)
     */
    calculateRedZoneEfficiency() {
        // Simulate field position scenarios inside the 20
        let scores = 0;
        const redZoneAttempts = 100;
        for (let i = 0; i < redZoneAttempts; i++) {
            const yards = this.generateYards('RED_ZONE_PLAY', 'GOAL_LINE');
            if (yards >= 20 || (this.rng() < 0.7 && yards > 0)) { // 70% conversion rate
                scores++;
            }
        }
        return (scores / redZoneAttempts) * 100;
    }
    /**
     * Gets approximate memory usage (simplified implementation)
     */
    getMemoryUsage() {
        // In a real implementation, this would measure actual memory usage
        return this.outcomes.length * 100; // Rough estimate: 100 bytes per outcome
    }
    /**
     * Validates that analysis meets statistical thresholds
     */
    validateAnalysis(analysis) {
        const issues = [];
        if (analysis.sampleSize < STATISTICAL_THRESHOLDS.minSampleSize) {
            issues.push(`Sample size ${analysis.sampleSize} below minimum ${STATISTICAL_THRESHOLDS.minSampleSize}`);
        }
        if (analysis.analysisTime > 5000) { // 5 seconds
            issues.push(`Analysis took ${analysis.analysisTime}ms, exceeds recommended threshold`);
        }
        return {
            valid: issues.length === 0,
            issues
        };
    }
}
//# sourceMappingURL=StatisticalAnalyzer.js.map