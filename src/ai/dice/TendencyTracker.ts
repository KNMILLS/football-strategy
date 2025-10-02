import type { PlaybookName, DefensivePlay } from '../../types/dice';
import type { GameState } from '../../domain/GameState';

/**
 * Enhanced tendency categories for new playbook system
 */
export type PlaybookTendencyCategory =
  | 'run_inside'
  | 'run_outside'
  | 'pass_short'
  | 'pass_deep'
  | 'play_action'
  | 'screen'
  | 'trick_play';

export type DefensiveTendencyCategory =
  | 'blitz'
  | 'coverage_man'
  | 'coverage_zone'
  | 'prevent'
  | 'goal_line'
  | 'balanced';

/**
 * Outcome pattern tracking
 */
export interface OutcomePattern {
  /** Play type that was called */
  playType: PlaybookTendencyCategory;
  /** Defensive response */
  defenseType: DefensiveTendencyCategory;
  /** Outcome effectiveness (yards, success rate, etc.) */
  yards: number;
  /** Whether it was successful (first down, TD, etc.) */
  success: boolean;
  /** Field position context */
  fieldPosition: number;
  /** Down and distance context */
  down: number;
  toGo: number;
}

/**
 * Tendency data for a specific situation
 */
export interface SituationTendency {
  /** Number of times this pattern occurred */
  count: number;
  /** Average yards gained */
  avgYards: number;
  /** Success rate (first down or better) */
  successRate: number;
  /** Last time this pattern was seen (game state reference) */
  lastSeen: number;
  /** Trend direction (improving/worsening) */
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Enhanced tendency tracker for dice-aware AI
 * Tracks patterns across playbooks, defensive responses, and outcomes
 */
export class TendencyTracker {
  private playbookTendencies: Map<string, Map<PlaybookTendencyCategory, SituationTendency>> = new Map();
  private defensiveTendencies: Map<string, Map<DefensiveTendencyCategory, SituationTendency>> = new Map();
  private outcomePatterns: OutcomePattern[] = [];
  private maxPatterns = 1000; // Limit memory usage

  /**
   * Record a play outcome for tendency tracking
   */
  recordOutcome(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory,
    defenseType: DefensiveTendencyCategory,
    gameState: GameState,
    yards: number,
    success: boolean
  ): void {
    const pattern: OutcomePattern = {
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
  getPlaybookTendency(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory
  ): SituationTendency | null {
    const key = `${playbook}:${playType}`;
    const tendencyMap = this.playbookTendencies.get(key);
    if (!tendencyMap) return null;

    // Return the most relevant tendency (could be improved with situation matching)
    for (const tendency of tendencyMap.values()) {
      if (tendency.count > 0) return tendency;
    }
    return null;
  }

  /**
   * Get tendency information for a defensive response
   */
  getDefensiveTendency(defenseType: DefensiveTendencyCategory): SituationTendency | null {
    const defenseMap = this.defensiveTendencies.get('global');
    return defenseMap?.get(defenseType) ?? null;
  }

  /**
   * Get matchup effectiveness between playbook play and defense
   */
  getMatchupEffectiveness(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory,
    defenseType: DefensiveTendencyCategory
  ): SituationTendency | null {
    const key = `${playbook}:${playType}:${defenseType}`;
    const situationMap = this.playbookTendencies.get(key);
    if (!situationMap) return null;

    // Return most relevant pattern
    for (const tendency of situationMap.values()) {
      if (tendency.count > 0) return tendency;
    }
    return null;
  }

  /**
   * Get recent patterns for analysis
   */
  getRecentPatterns(count: number = 20): OutcomePattern[] {
    return this.outcomePatterns.slice(-count);
  }

  /**
   * Analyze patterns for a specific game situation
   */
  analyzeSituation(
    gameState: GameState,
    playbook?: PlaybookName
  ): {
    recommendedPlays: Array<{ playType: PlaybookTendencyCategory; confidence: number; reasoning: string }>;
    defensiveWeaknesses: Array<{ defenseType: DefensiveTendencyCategory; vulnerability: number }>;
  } {
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
    const playTypeStats = new Map<PlaybookTendencyCategory, { count: number; totalYards: number; successes: number }>();

    for (const pattern of similarPatterns) {
      const stats = playTypeStats.get(pattern.playType) ?? { count: 0, totalYards: 0, successes: 0 };
      stats.count++;
      stats.totalYards += pattern.yards;
      if (pattern.success) stats.successes++;
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
  reset(): void {
    this.playbookTendencies = new Map();
    this.defensiveTendencies = new Map();
    this.outcomePatterns = [];
  }

  /**
   * Update playbook-specific tendency data
   */
  private updatePlaybookTendency(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory,
    pattern: OutcomePattern
  ): void {
    const key = `${playbook}:${playType}`;
    if (!this.playbookTendencies.has(key)) {
      this.playbookTendencies.set(key, new Map());
    }

    const tendencyMap = this.playbookTendencies.get(key)!;
    const existing = tendencyMap.get(playType) ?? {
      count: 0,
      avgYards: 0,
      successRate: 0,
      lastSeen: 0,
      trend: 'stable' as const
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
  private updateDefensiveTendency(
    defenseType: DefensiveTendencyCategory,
    pattern: OutcomePattern
  ): void {
    if (!this.defensiveTendencies.has('global')) {
      this.defensiveTendencies.set('global', new Map());
    }

    const tendencyMap = this.defensiveTendencies.get('global')!;
    const existing = tendencyMap.get(defenseType) ?? {
      count: 0,
      avgYards: 0,
      successRate: 0,
      lastSeen: 0,
      trend: 'stable' as const
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
  private updateSituationTendency(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory,
    defenseType: DefensiveTendencyCategory,
    pattern: OutcomePattern
  ): void {
    const key = `${playbook}:${playType}:${defenseType}`;
    if (!this.playbookTendencies.has(key)) {
      this.playbookTendencies.set(key, new Map());
    }

    const tendencyMap = this.playbookTendencies.get(key)!;
    const situationKey = `${pattern.down}:${pattern.toGo}:${this.getFieldZone(pattern.fieldPosition)}`;

    const existing = tendencyMap.get(situationKey as any) ?? {
      count: 0,
      avgYards: 0,
      successRate: 0,
      lastSeen: 0,
      trend: 'stable' as const
    };

    const alpha = 0.3; // Higher learning rate for specific situations
    existing.count++;
    existing.avgYards = existing.avgYards * (1 - alpha) + pattern.yards * alpha;
    existing.successRate = existing.successRate * (1 - alpha) + (pattern.success ? 1 : 0) * alpha;
    existing.lastSeen = Date.now();
    existing.trend = this.calculateTrend(existing, pattern);

    tendencyMap.set(situationKey as any, existing);
  }

  /**
   * Calculate trend direction for a tendency
   */
  private calculateTrend(existing: SituationTendency, newPattern: OutcomePattern): 'improving' | 'stable' | 'declining' {
    if (existing.count < 3) return 'stable';

    const recentPerformance = newPattern.success ? 1 : 0;
    const historicalPerformance = existing.successRate;

    const diff = recentPerformance - historicalPerformance;
    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Check if pattern matches current situation
   */
  private patternMatchesSituation(
    pattern: OutcomePattern,
    fieldZone: string,
    downDistance: string
  ): boolean {
    const patternFieldZone = this.getFieldZone(pattern.fieldPosition);
    const patternDownDistance = `${pattern.down}:${this.getDistanceBucket(pattern.toGo)}`;

    return patternFieldZone === fieldZone && patternDownDistance === downDistance;
  }

  /**
   * Get field zone category
   */
  private getFieldZone(position: number): string {
    if (position <= 20) return 'own';
    if (position <= 40) return 'own_mid';
    if (position <= 60) return 'opp_mid';
    if (position <= 80) return 'opp';
    return 'red_zone';
  }

  /**
   * Get down-distance category
   */
  private getDownDistanceCategory(down: number, toGo: number): string {
    const distanceBucket = this.getDistanceBucket(toGo);
    return `${down}:${distanceBucket}`;
  }

  /**
   * Get distance bucket
   */
  private getDistanceBucket(toGo: number): string {
    if (toGo <= 3) return 'short';
    if (toGo <= 7) return 'medium';
    return 'long';
  }

  /**
   * Analyze defensive weaknesses based on recent patterns
   */
  private analyzeDefensiveWeaknesses(patterns: OutcomePattern[]): Array<{ defenseType: DefensiveTendencyCategory; vulnerability: number }> {
    const defenseStats = new Map<DefensiveTendencyCategory, { count: number; failures: number }>();

    for (const pattern of patterns) {
      const stats = defenseStats.get(pattern.defenseType) ?? { count: 0, failures: 0 };
      stats.count++;
      if (!pattern.success) stats.failures++;
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
