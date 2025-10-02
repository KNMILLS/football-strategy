import type { GameState } from '../../domain/GameState';
import type { PlaybookName, PlaybookCard, DefensivePlay } from '../../types/dice';
import type { CoachProfile } from '../CoachProfiles';
import type { PlayCandidate, DefenseCandidate } from './PlaybookCoach';
import { TendencyTracker } from './TendencyTracker';

/**
 * Validation result for AI decisions
 */
export interface ValidationResult {
  /** Whether the decision is valid */
  isValid: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Specific violations found */
  violations: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Overall assessment */
  assessment: 'excellent' | 'good' | 'acceptable' | 'poor' | 'invalid';
}

/**
 * Decision context for validation
 */
export interface DecisionContext {
  /** Game state when decision was made */
  gameState: GameState;
  /** Coach profile being used */
  coachProfile: CoachProfile;
  /** Available playbooks */
  availablePlaybooks: PlaybookName[];
  /** Recent game history for context */
  recentHistory?: Array<{
    play: string;
    result: string;
    fieldPosition: number;
  }>;
}

/**
 * Decision validator to ensure AI choices align with coach profiles
 * Validates that AI decisions are consistent with coach personality and strategic preferences
 */
export class DecisionValidator {
  private tendencyTracker = new TendencyTracker();

  /**
   * Validate offensive play selection
   */
  validateOffensivePlay(
    selectedPlay: PlayCandidate,
    allCandidates: PlayCandidate[],
    context: DecisionContext
  ): ValidationResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check if selected play aligns with coach preferences
    const preferenceAlignment = this.validatePlaybookPreference(selectedPlay, context);
    if (!preferenceAlignment.isValid) {
      violations.push(preferenceAlignment.violation!);
    }

    // Check risk tolerance alignment
    const riskAlignment = this.validateRiskTolerance(selectedPlay, context);
    if (!riskAlignment.isValid) {
      violations.push(riskAlignment.violation!);
    }

    // Check situational appropriateness
    const situationalAlignment = this.validateSituationalFit(selectedPlay, context);
    if (!situationalAlignment.isValid) {
      violations.push(situationalAlignment.violation!);
    }

    // Check tendency consistency
    const tendencyAlignment = this.validateTendencyConsistency(selectedPlay, context);
    if (!tendencyAlignment.isValid) {
      violations.push(tendencyAlignment.violation!);
    }

    // Generate suggestions based on better alternatives
    suggestions.push(...this.generateOffensiveSuggestions(selectedPlay, allCandidates, context));

    // Calculate overall confidence
    const confidence = this.calculateOffensiveConfidence(selectedPlay, violations, context);

    // Determine assessment
    const assessment = this.determineAssessment(violations, confidence);

    return {
      isValid: violations.length === 0,
      confidence,
      violations,
      suggestions,
      assessment
    };
  }

  /**
   * Validate defensive play selection
   */
  validateDefensivePlay(
    selectedDefense: DefenseCandidate,
    allCandidates: DefenseCandidate[],
    context: DecisionContext
  ): ValidationResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check aggression alignment
    const aggressionAlignment = this.validateDefensiveAggression(selectedDefense, context);
    if (!aggressionAlignment.isValid) {
      violations.push(aggressionAlignment.violation!);
    }

    // Check situational appropriateness
    const situationalAlignment = this.validateDefensiveSituationalFit(selectedDefense, context);
    if (!situationalAlignment.isValid) {
      violations.push(situationalAlignment.violation!);
    }

    // Generate suggestions
    suggestions.push(...this.generateDefensiveSuggestions(selectedDefense, allCandidates, context));

    // Calculate confidence
    const confidence = this.calculateDefensiveConfidence(selectedDefense, violations, context);

    // Determine assessment
    const assessment = this.determineAssessment(violations, confidence);

    return {
      isValid: violations.length === 0,
      confidence,
      violations,
      suggestions,
      assessment
    };
  }

  /**
   * Validate penalty decision
   */
  validatePenaltyDecision(
    decision: 'accept' | 'decline',
    confidence: number,
    context: DecisionContext,
    penaltyInfo: any,
    penaltyYards: number
  ): ValidationResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check if decision aligns with coach's risk tolerance
    const riskAlignment = this.validatePenaltyRiskTolerance(decision, context, penaltyInfo);
    if (!riskAlignment.isValid) {
      violations.push(riskAlignment.violation!);
    }

    // Check situational factors
    const situationalAlignment = this.validatePenaltySituation(decision, context, penaltyYards);
    if (!situationalAlignment.isValid) {
      violations.push(situationalAlignment.violation!);
    }

    // Generate suggestions
    suggestions.push(...this.generatePenaltySuggestions(decision, context, penaltyInfo));

    // Use provided confidence but adjust based on violations
    const adjustedConfidence = Math.max(0, confidence - (violations.length * 0.2));

    const assessment = this.determineAssessment(violations, adjustedConfidence);

    return {
      isValid: violations.length === 0,
      confidence: adjustedConfidence,
      violations,
      suggestions,
      assessment
    };
  }

  /**
   * Validate that selected play aligns with coach's playbook preferences
   */
  private validatePlaybookPreference(selectedPlay: PlayCandidate, context: DecisionContext): { isValid: boolean; violation?: string } {
    const { coachProfile } = context;
    const preference = coachProfile.playbookPreferences[selectedPlay.card.playbook];

    // Check if preference is below acceptable threshold
    if (preference < 0.3) {
      return {
        isValid: false,
        violation: `Selected playbook ${selectedPlay.card.playbook} has low preference (${preference.toFixed(2)}) for this coach`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate that play risk level aligns with coach's risk tolerance
   */
  private validateRiskTolerance(selectedPlay: PlayCandidate, context: DecisionContext): { isValid: boolean; violation?: string } {
    const { coachProfile, gameState } = context;
    const playType = this.categorizePlayRisk(selectedPlay.card);

    // High-risk plays should only be selected by high risk-tolerance coaches
    if (playType === 'high_risk' && coachProfile.riskTolerance < 0.6) {
      return {
        isValid: false,
        violation: `High-risk play selected by conservative coach (tolerance: ${coachProfile.riskTolerance.toFixed(2)})`
      };
    }

    // Conservative plays by aggressive coaches in good situations
    if (playType === 'conservative' && coachProfile.riskTolerance > 0.8 && this.isAdvantageousSituation(gameState)) {
      return {
        isValid: false,
        violation: 'Conservative play selected in advantageous situation by aggressive coach'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate situational fit of the play
   */
  private validateSituationalFit(selectedPlay: PlayCandidate, context: DecisionContext): { isValid: boolean; violation?: string } {
    const { gameState } = context;
    const playType = this.categorizePlayType(selectedPlay.card.label);

    // Deep passes from own territory are risky
    if (playType === 'pass_deep' && gameState.ballOn <= 20) {
      return {
        isValid: false,
        violation: 'Deep pass attempted from poor field position'
      };
    }

    // Runs on obvious passing downs
    if (playType === 'run_inside' && gameState.down >= 3 && gameState.toGo >= 8) {
      return {
        isValid: false,
        violation: 'Inside run on obvious passing down'
      };
    }

    // Trick plays in conservative situations
    if (playType === 'trick_play' && gameState.down <= 2 && gameState.ballOn <= 50) {
      return {
        isValid: false,
        violation: 'Trick play in conservative game situation'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate tendency consistency
   */
  private validateTendencyConsistency(selectedPlay: PlayCandidate, context: DecisionContext): { isValid: boolean; violation?: string } {
    // This would check against learned tendencies from recent games
    // For now, simplified validation
    return { isValid: true };
  }

  /**
   * Validate defensive aggression alignment
   */
  private validateDefensiveAggression(selectedDefense: DefenseCandidate, context: DecisionContext): { isValid: boolean; violation?: string } {
    const { coachProfile, gameState } = context;
    const defenseType = this.categorizeDefenseAggression(selectedDefense.play);

    // Aggressive defenses by conservative coaches
    if (defenseType === 'aggressive' && coachProfile.aggression < 0.4) {
      return {
        isValid: false,
        violation: `Aggressive defense selected by conservative coach (aggression: ${coachProfile.aggression.toFixed(2)})`
      };
    }

    // Conservative defenses by aggressive coaches in opponent territory
    if (defenseType === 'conservative' && coachProfile.aggression > 0.7 && gameState.ballOn >= 50) {
      return {
        isValid: false,
        violation: 'Conservative defense in opponent territory by aggressive coach'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate defensive situational fit
   */
  private validateDefensiveSituationalFit(selectedDefense: DefenseCandidate, context: DecisionContext): { isValid: boolean; violation?: string } {
    const { gameState } = context;
    const defenseType = this.categorizeDefenseType(selectedDefense.play);

    // Prevent defense when opponent has the ball in field goal range
    if (defenseType === 'prevent' && gameState.ballOn >= 80 && gameState.clock <= 300) {
      return {
        isValid: false,
        violation: 'Prevent defense in opponent field goal range late in game'
      };
    }

    // Goal line defense when not in goal line situation
    if (defenseType === 'goal_line' && gameState.ballOn >= 20) {
      return {
        isValid: false,
        violation: 'Goal line defense outside of goal line situation'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate penalty decision risk tolerance
   */
  private validatePenaltyRiskTolerance(
    decision: 'accept' | 'decline',
    context: DecisionContext,
    penaltyInfo: any
  ): { isValid: boolean; violation?: string } {
    const { coachProfile } = context;

    // Risky penalty acceptance by conservative coaches
    if (decision === 'accept' && coachProfile.riskTolerance < 0.4 && penaltyInfo.yards > 10) {
      return {
        isValid: false,
        violation: `Risky penalty acceptance by conservative coach (yards: ${penaltyInfo.yards})`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate penalty situation
   */
  private validatePenaltySituation(
    decision: 'accept' | 'decline',
    context: DecisionContext,
    penaltyYards: number
  ): { isValid: boolean; violation?: string } {
    const { gameState } = context;

    // Accepting penalties late in half when trailing
    if (decision === 'accept' && gameState.clock <= 120 && this.getScoreDifferential(context) < 0) {
      return {
        isValid: false,
        violation: 'Accepting penalty late in half when trailing'
      };
    }

    return { isValid: true };
  }

  /**
   * Generate suggestions for better offensive plays
   */
  private generateOffensiveSuggestions(
    selectedPlay: PlayCandidate,
    allCandidates: PlayCandidate[],
    context: DecisionContext
  ): string[] {
    const suggestions: string[] = [];
    const { coachProfile } = context;

    // Find better alternatives based on coach preferences
    const betterAlternatives = allCandidates
      .filter(candidate =>
        candidate.card.playbook !== selectedPlay.card.playbook &&
        coachProfile.playbookPreferences[candidate.card.playbook] > coachProfile.playbookPreferences[selectedPlay.card.playbook] + 0.2
      )
      .slice(0, 2);

    if (betterAlternatives.length > 0) {
      suggestions.push(`Consider ${betterAlternatives.map(c => c.card.playbook).join(' or ')} plays (higher preference)`);
    }

    return suggestions;
  }

  /**
   * Generate suggestions for better defensive plays
   */
  private generateDefensiveSuggestions(
    selectedDefense: DefenseCandidate,
    allCandidates: DefenseCandidate[],
    context: DecisionContext
  ): string[] {
    const suggestions: string[] = [];
    const { gameState } = context;

    // Suggest more aggressive defense in opponent territory
    if (gameState.ballOn >= 50 && !this.categorizeDefenseAggression(selectedDefense.play)) {
      const aggressiveOptions = allCandidates.filter(c =>
        this.categorizeDefenseAggression(c.play) === 'aggressive'
      );

      if (aggressiveOptions.length > 0) {
        suggestions.push('Consider more aggressive defense in opponent territory');
      }
    }

    return suggestions;
  }

  /**
   * Generate penalty decision suggestions
   */
  private generatePenaltySuggestions(
    decision: 'accept' | 'decline',
    context: DecisionContext,
    penaltyInfo: any
  ): string[] {
    const suggestions: string[] = [];

    if (decision === 'accept' && penaltyInfo.yards > 15) {
      suggestions.push('Consider declining very large penalties');
    }

    return suggestions;
  }

  /**
   * Calculate confidence for offensive play selection
   */
  private calculateOffensiveConfidence(
    selectedPlay: PlayCandidate,
    violations: string[],
    context: DecisionContext
  ): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence for violations
    confidence -= violations.length * 0.2;

    // Boost confidence for strong coach preference alignment
    const preference = context.coachProfile.playbookPreferences[selectedPlay.card.playbook];
    if (preference > 0.8) confidence += 0.1;

    // Boost confidence for high EV plays
    if (selectedPlay.expectedValue > 5) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate confidence for defensive play selection
   */
  private calculateDefensiveConfidence(
    selectedDefense: DefenseCandidate,
    violations: string[],
    context: DecisionContext
  ): number {
    let confidence = 0.7; // Base confidence

    // Reduce confidence for violations
    confidence -= violations.length * 0.2;

    // Boost confidence for high EV defenses
    if (selectedDefense.expectedValue > 4) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine overall assessment
   */
  private determineAssessment(violations: string[], confidence: number): ValidationResult['assessment'] {
    if (violations.length > 2) return 'invalid';
    if (violations.length > 1) return 'poor';
    if (confidence < 0.4) return 'poor';
    if (confidence < 0.6) return 'acceptable';
    if (confidence < 0.8) return 'good';
    return 'excellent';
  }

  /**
   * Helper methods for categorization
   */
  private categorizePlayType(cardLabel: string): string {
    const label = cardLabel.toLowerCase();
    if (label.includes('deep') || label.includes('bomb')) return 'pass_deep';
    if (label.includes('pass') || label.includes('slant') || label.includes('curl')) return 'pass_short';
    if (label.includes('trick') || label.includes('reverse')) return 'trick_play';
    return 'run';
  }

  private categorizePlayRisk(card: PlaybookCard): 'high_risk' | 'medium_risk' | 'conservative' {
    if (card.type === 'pass' && card.label.toLowerCase().includes('deep')) return 'high_risk';
    if (card.type === 'run' && card.playbook === 'Smashmouth') return 'conservative';
    return 'medium_risk';
  }

  private categorizeDefenseType(defensePlay: DefensivePlay): string {
    if (defensePlay.includes('Blitz')) return 'aggressive';
    if (defensePlay.includes('Prevent')) return 'conservative';
    return 'balanced';
  }

  private categorizeDefenseAggression(defensePlay: DefensivePlay): 'aggressive' | 'conservative' | 'balanced' {
    if (defensePlay.includes('Blitz')) return 'aggressive';
    if (defensePlay.includes('Prevent')) return 'conservative';
    return 'balanced';
  }

  private isAdvantageousSituation(gameState: GameState): boolean {
    return gameState.ballOn >= 50 || (gameState.down <= 2 && gameState.toGo <= 7);
  }

  private getScoreDifferential(context: DecisionContext): number {
    return context.gameState.score.player - context.gameState.score.ai;
  }
}
