/**
 * Enhanced tendency tracker for dice-aware AI
 * Tracks patterns across playbooks, defensive responses, and outcomes
 */
export class TendencyTracker {
    playbookTendencies = new Map();
    defensiveTendencies = new Map();
    outcomePatterns = [];
    maxPatterns = 1000; // Limit memory usage
    /**
     * Record a play outcome for tendency tracking
     */
    recordOutcome(playbook, playType, defenseType, gameState, yards, success) {
        const pattern = {
            playType,
            defenseType,
            yards,
            success,
            fieldPosition: gameState.ballOn,
            down: gameState.down,
            toGo: gameState.toGo
        };
        // Add to pattern history
        this.outcomePatterns.push(pattern);
        if (this.outcomePatterns.length > this.maxPatterns) {
            this.outcomePatterns.shift(); // Remove oldest
        }
        // Update playbook tendencies
        this.updatePlaybookTendency(playbook, playType, pattern);
        // Update defensive tendencies
        this.updateDefensiveTendency(defenseType, pattern);
        // Update global situation tendencies
        this.updateSituationTendency(playbook, playType, defenseType, pattern);
    }
    /**
     * Get tendency information for a playbook and play type
     */
    getPlaybookTendency(playbook, playType) {
        const key = `${playbook}:${playType}`;
        const tendencyMap = this.playbookTendencies.get(key);
        if (!tendencyMap)
            return null;
        // Return the most relevant tendency (could be improved with situation matching)
        for (const tendency of tendencyMap.values()) {
            if (tendency.count > 0)
                return tendency;
        }
        return null;
    }
    /**
     * Get tendency information for a defensive response
     */
    getDefensiveTendency(defenseType) {
        const defenseMap = this.defensiveTendencies.get('global');
        return defenseMap?.get(defenseType) ?? null;
    }
    /**
     * Get matchup effectiveness between playbook play and defense
     */
    getMatchupEffectiveness(playbook, playType, defenseType) {
        const key = `${playbook}:${playType}:${defenseType}`;
        const situationMap = this.playbookTendencies.get(key);
        if (!situationMap)
            return null;
        // Return most relevant pattern
        for (const tendency of situationMap.values()) {
            if (tendency.count > 0)
                return tendency;
        }
        return null;
    }
    /**
     * Get recent patterns for analysis
     */
    getRecentPatterns(count = 20) {
        return this.outcomePatterns.slice(-count);
    }
    /**
     * Analyze patterns for a specific game situation
     */
    analyzeSituation(gameState, playbook) {
        const fieldZone = this.getFieldZone(gameState.ballOn);
        const downDistance = this.getDownDistanceCategory(gameState.down, gameState.toGo);
        // Find successful patterns in similar situations
        const similarPatterns = this.outcomePatterns.filter(pattern => {
            if (playbook && pattern.playType !== 'pass_short' && pattern.playType !== 'pass_deep') {
                // For specific playbooks, filter by field zone and down
                return this.patternMatchesSituation(pattern, fieldZone, downDistance);
            }
            return false;
        });
        // Aggregate recommendations
        const playTypeStats = new Map();
        for (const pattern of similarPatterns) {
            const stats = playTypeStats.get(pattern.playType) ?? { count: 0, totalYards: 0, successes: 0 };
            stats.count++;
            stats.totalYards += pattern.yards;
            if (pattern.success)
                stats.successes++;
            playTypeStats.set(pattern.playType, stats);
        }
        // Generate recommendations
        const recommendations = Array.from(playTypeStats.entries())
            .map(([playType, stats]) => ({
            playType,
            confidence: Math.min(stats.count / 10, 1) * (stats.successes / Math.max(stats.count, 1)),
            reasoning: `${stats.successes}/${stats.count} success rate, avg ${Math.round(stats.totalYards / stats.count)} yards`
        }))
            .filter(rec => rec.confidence > 0.3)
            .sort((a, b) => b.confidence - a.confidence);
        // Find defensive weaknesses (plays that worked well recently)
        const defensiveWeaknesses = this.analyzeDefensiveWeaknesses(similarPatterns);
        return {
            recommendedPlays: recommendations,
            defensiveWeaknesses
        };
    }
    /**
     * Reset all tendency data (for new game)
     */
    reset() {
        this.playbookTendencies = new Map();
        this.defensiveTendencies = new Map();
        this.outcomePatterns = [];
    }
    /**
     * Update playbook-specific tendency data
     */
    updatePlaybookTendency(playbook, playType, pattern) {
        const key = `${playbook}:${playType}`;
        if (!this.playbookTendencies.has(key)) {
            this.playbookTendencies.set(key, new Map());
        }
        const tendencyMap = this.playbookTendencies.get(key);
        const existing = tendencyMap.get(playType) ?? {
            count: 0,
            avgYards: 0,
            successRate: 0,
            lastSeen: 0,
            trend: 'stable'
        };
        // Update with exponential moving average
        const alpha = 0.2; // Learning rate
        existing.count++;
        existing.avgYards = existing.avgYards * (1 - alpha) + pattern.yards * alpha;
        existing.successRate = existing.successRate * (1 - alpha) + (pattern.success ? 1 : 0) * alpha;
        existing.lastSeen = Date.now();
        existing.trend = this.calculateTrend(existing, pattern);
        tendencyMap.set(playType, existing);
    }
    /**
     * Update defensive tendency data
     */
    updateDefensiveTendency(defenseType, pattern) {
        if (!this.defensiveTendencies.has('global')) {
            this.defensiveTendencies.set('global', new Map());
        }
        const tendencyMap = this.defensiveTendencies.get('global');
        const existing = tendencyMap.get(defenseType) ?? {
            count: 0,
            avgYards: 0,
            successRate: 0,
            lastSeen: 0,
            trend: 'stable'
        };
        // Update with exponential moving average
        const alpha = 0.2;
        existing.count++;
        existing.avgYards = existing.avgYards * (1 - alpha) + pattern.yards * alpha;
        existing.successRate = existing.successRate * (1 - alpha) + (pattern.success ? 1 : 0) * alpha;
        existing.lastSeen = Date.now();
        existing.trend = this.calculateTrend(existing, pattern);
        tendencyMap.set(defenseType, existing);
    }
    /**
     * Update situation-specific tendency data
     */
    updateSituationTendency(playbook, playType, defenseType, pattern) {
        const key = `${playbook}:${playType}:${defenseType}`;
        if (!this.playbookTendencies.has(key)) {
            this.playbookTendencies.set(key, new Map());
        }
        const tendencyMap = this.playbookTendencies.get(key);
        const situationKey = `${pattern.down}:${pattern.toGo}:${this.getFieldZone(pattern.fieldPosition)}`;
        const existing = tendencyMap.get(situationKey) ?? {
            count: 0,
            avgYards: 0,
            successRate: 0,
            lastSeen: 0,
            trend: 'stable'
        };
        const alpha = 0.3; // Higher learning rate for specific situations
        existing.count++;
        existing.avgYards = existing.avgYards * (1 - alpha) + pattern.yards * alpha;
        existing.successRate = existing.successRate * (1 - alpha) + (pattern.success ? 1 : 0) * alpha;
        existing.lastSeen = Date.now();
        existing.trend = this.calculateTrend(existing, pattern);
        tendencyMap.set(situationKey, existing);
    }
    /**
     * Calculate trend direction for a tendency
     */
    calculateTrend(existing, newPattern) {
        if (existing.count < 3)
            return 'stable';
        const recentPerformance = newPattern.success ? 1 : 0;
        const historicalPerformance = existing.successRate;
        const diff = recentPerformance - historicalPerformance;
        if (diff > 0.1)
            return 'improving';
        if (diff < -0.1)
            return 'declining';
        return 'stable';
    }
    /**
     * Check if pattern matches current situation
     */
    patternMatchesSituation(pattern, fieldZone, downDistance) {
        const patternFieldZone = this.getFieldZone(pattern.fieldPosition);
        const patternDownDistance = `${pattern.down}:${this.getDistanceBucket(pattern.toGo)}`;
        return patternFieldZone === fieldZone && patternDownDistance === downDistance;
    }
    /**
     * Get field zone category
     */
    getFieldZone(position) {
        if (position <= 20)
            return 'own';
        if (position <= 40)
            return 'own_mid';
        if (position <= 60)
            return 'opp_mid';
        if (position <= 80)
            return 'opp';
        return 'red_zone';
    }
    /**
     * Get down-distance category
     */
    getDownDistanceCategory(down, toGo) {
        const distanceBucket = this.getDistanceBucket(toGo);
        return `${down}:${distanceBucket}`;
    }
    /**
     * Get distance bucket
     */
    getDistanceBucket(toGo) {
        if (toGo <= 3)
            return 'short';
        if (toGo <= 7)
            return 'medium';
        return 'long';
    }
    /**
     * Analyze defensive weaknesses based on recent patterns
     */
    analyzeDefensiveWeaknesses(patterns) {
        const defenseStats = new Map();
        for (const pattern of patterns) {
            const stats = defenseStats.get(pattern.defenseType) ?? { count: 0, failures: 0 };
            stats.count++;
            if (!pattern.success)
                stats.failures++;
            defenseStats.set(pattern.defenseType, stats);
        }
        return Array.from(defenseStats.entries())
            .map(([defenseType, stats]) => ({
            defenseType,
            vulnerability: stats.failures / Math.max(stats.count, 1)
        }))
            .filter(v => v.vulnerability > 0.3)
            .sort((a, b) => b.vulnerability - a.vulnerability);
    }
}
//# sourceMappingURL=TendencyTracker.js.map