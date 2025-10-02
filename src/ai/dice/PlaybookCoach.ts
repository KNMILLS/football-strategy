import type { RNG } from '../../sim/RNG';
import { createLCG } from '../../sim/RNG';
import type { GameState } from '../../domain/GameState';
import type { PlaybookName, DefensivePlay, PlaybookCard } from '../../types/dice';
import type { CoachProfile } from '../CoachProfiles';
import { EVCalculator, defaultScorePosition, defaultFieldPositionValue } from './EVCalculator';
import type { EVContext } from './EVCalculator';
import { PenaltyAdvisor } from './PenaltyAdvisor';
import type { PenaltyContext } from './PenaltyAdvisor';
import { TendencyTracker } from './TendencyTracker';
import type { PlaybookTendencyCategory } from './TendencyTracker';

/**
 * Play selection candidate for the new dice system
 */
export interface PlayCandidate {
  /** Playbook card */
  card: PlaybookCard;
  /** Expected value from simulations */
  expectedValue: number;
  /** Coach preference adjustment */
  coachPreference: number;
  /** Tendency-based adjustment */
  tendencyBonus: number;
  /** Final utility score */
  utility: number;
  /** Reasoning for selection */
  reasoning: string;
}

/**
 * Defense selection candidate
 */
export interface DefenseCandidate {
  /** Defensive play */
  play: DefensivePlay;
  /** Expected value against predicted offense */
  expectedValue: number;
  /** Tendency-based effectiveness */
  tendencyEffectiveness: number;
  /** Final utility score */
  utility: number;
}

/**
 * Main coach class for dice-aware AI system
 * Integrates EV calculations, penalty decisions, and tendency tracking
 */
export class PlaybookCoach {
  private rng: RNG = createLCG(0);
  private evCalculator = new EVCalculator();
  private penaltyAdvisor = new PenaltyAdvisor();
  private tendencyTracker = new TendencyTracker();

  constructor(
    private coachProfile: CoachProfile,
    private availablePlaybooks: PlaybookName[]
  ) {}

  /**
   * Select offensive play using EV calculations and coach preferences
   */
  selectOffensivePlay(
    gameState: GameState,
    availableCards: PlaybookCard[],
    defensivePlays: DefensivePlay[],
    matchupTables: Map<string, any>, // Simplified for this implementation
    penaltyTable: any,
    rngSeed: number
  ): PlayCandidate {
    this.rng = createLCG(rngSeed);

    // Filter cards by current playbook if specified
    const validCards = availableCards.filter(card =>
      this.isValidPlay(card, gameState)
    );

    if (validCards.length === 0) {
      throw new Error('No valid plays available');
    }

    // Calculate EV for each candidate
    const candidates = validCards.map(card => {
      const evContext: EVContext = {
        gameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      // Get tendency information
      const playType = this.categorizePlayType(card.label);
      const tendencyBonus = this.getTendencyBonus(card.playbook, playType, gameState);

      // Calculate EV against different defensive responses
      const evMatrix = new Map<DefensivePlay, number>();
      let totalEV = 0;

      for (const defensePlay of defensivePlays) {
        // Simplified: use average EV across all defenses for now
        const candidateEV = this.calculateCandidateEV(card, defensePlay, evContext, rngSeed++);
        evMatrix.set(defensePlay, candidateEV);
        totalEV += candidateEV;
      }

      const expectedValue = totalEV / defensivePlays.length;

      // Apply coach preferences
      const coachPreference = this.coachProfile.playbookPreferences[card.playbook] || 0.5;

      // Calculate final utility
      const baseUtility = expectedValue;
      const preferenceBonus = (coachPreference - 0.5) * 0.3;
      const tendencyMultiplier = 1 + tendencyBonus;
      const utility = (baseUtility + preferenceBonus) * tendencyMultiplier;

      return {
        card,
        expectedValue,
        coachPreference,
        tendencyBonus,
        utility,
        reasoning: this.generatePlayReasoning(card, expectedValue, coachPreference, tendencyBonus)
      };
    });

    // Apply softmax selection with temperature based on coach aggression
    const temperature = this.calculateSelectionTemperature(gameState);
    const selected = this.softmaxSelect(candidates, temperature);

    return selected;
  }

  /**
   * Select defensive play using EV calculations and opponent modeling
   */
  selectDefensivePlay(
    gameState: GameState,
    defensivePlays: DefensivePlay[],
    predictedOffense: Map<PlaybookTendencyCategory, number>,
    rngSeed: number
  ): DefenseCandidate {
    this.rng = createLCG(rngSeed);

    const candidates = defensivePlays.map(play => {
      // Calculate effectiveness against predicted offense
      const playType = this.categorizeDefenseType(play);
      const tendencyEffectiveness = this.calculateDefenseEffectiveness(playType, predictedOffense);

      // Simple EV calculation (could be enhanced with simulations)
      const expectedValue = this.calculateDefenseEV(play, gameState, predictedOffense);

      const utility = expectedValue + tendencyEffectiveness * 0.2;

      return {
        play,
        expectedValue,
        tendencyEffectiveness,
        utility
      };
    });

    // Select with temperature based on game situation
    const temperature = this.calculateDefenseSelectionTemperature(gameState);
    const selected = this.softmaxSelectDefense(candidates, temperature);

    return selected;
  }

  /**
   * Make penalty decision using the penalty advisor
   */
  makePenaltyDecision(
    gameState: GameState,
    penaltyInfo: any,
    penaltyYards: number,
    isSpotFoul: boolean,
    rngSeed: number
  ): { decision: 'accept' | 'decline'; confidence: number; reasoning: string } {
    const context: PenaltyContext = {
      gameState,
      penaltyInfo,
      fieldPosition: gameState.ballOn,
      penaltyYards,
      isSpotFoul,
      down: gameState.down,
      toGo: gameState.toGo,
      timeRemaining: gameState.clock,
      scoreDifferential: gameState.score.player - gameState.score.ai,
      coachProfile: this.coachProfile
    };

    const analysis = this.penaltyAdvisor.analyzePenalty(context);

    return {
      decision: analysis.action,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    };
  }

  /**
   * Record play outcome for tendency tracking
   */
  recordPlayOutcome(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory,
    defenseType: string,
    gameState: GameState,
    yards: number,
    success: boolean
  ): void {
    this.tendencyTracker.recordOutcome(
      playbook,
      playType,
      this.categorizeDefenseType(defenseType as DefensivePlay),
      gameState,
      yards,
      success
    );
  }

  /**
   * Reset coach state for new game
   */
  reset(rngSeed: number): void {
    this.rng = createLCG(rngSeed);
    this.tendencyTracker.reset();
  }

  /**
   * Check if a play is valid for current game state
   */
  private isValidPlay(card: PlaybookCard, gameState: GameState): boolean {
    // Field position restrictions (e.g., no deep passes from own goal line)
    if (gameState.ballOn <= 10 && card.type === 'pass') {
      return false;
    }

    // Down and distance considerations
    if (gameState.down >= 3 && gameState.toGo >= 8 && card.type === 'run') {
      return false; // Less likely to convert long yardage with runs on late downs
    }

    return true;
  }

  /**
   * Categorize play type for tendency tracking
   */
  private categorizePlayType(cardLabel: string): PlaybookTendencyCategory {
    const label = cardLabel.toLowerCase();

    if (label.includes('slant') || label.includes('stick') || label.includes('curl')) {
      return 'pass_short';
    }
    if (label.includes('vert') || label.includes('deep') || label.includes('bomb')) {
      return 'pass_deep';
    }
    if (label.includes('zone') || label.includes('inside') || label.includes('off tackle')) {
      return 'run_inside';
    }
    if (label.includes('outside') || label.includes('sweep') || label.includes('edge')) {
      return 'run_outside';
    }
    if (label.includes('action') || label.includes('boot')) {
      return 'play_action';
    }
    if (label.includes('screen') || label.includes('swing')) {
      return 'screen';
    }
    if (label.includes('trick') || label.includes('reverse') || label.includes('flea')) {
      return 'trick_play';
    }

    // Default categorization
    return cardLabel.includes('pass') ? 'pass_short' : 'run_inside';
  }

  /**
   * Categorize defensive play type
   */
  private categorizeDefenseType(defensePlay: DefensivePlay): any {
    if (defensePlay.includes('Blitz')) return 'blitz';
    if (defensePlay.includes('Cover 1') || defensePlay.includes('Man')) return 'coverage_man';
    if (defensePlay.includes('Cover') && !defensePlay.includes('Man')) return 'coverage_zone';
    if (defensePlay.includes('Prevent')) return 'prevent';
    if (defensePlay.includes('Goal Line')) return 'goal_line';
    return 'balanced';
  }

  /**
   * Get tendency bonus for a play type
   */
  private getTendencyBonus(
    playbook: PlaybookName,
    playType: PlaybookTendencyCategory,
    gameState: GameState
  ): number {
    const tendency = this.tendencyTracker.getPlaybookTendency(playbook, playType);
    if (!tendency || tendency.count < 3) return 0;

    // Positive bonus for improving trends, negative for declining
    const trendBonus = tendency.trend === 'improving' ? 0.2 :
                      tendency.trend === 'declining' ? -0.2 : 0;

    // Success rate bonus (scaled)
    const successBonus = (tendency.successRate - 0.5) * 0.4;

    return trendBonus + successBonus;
  }

  /**
   * Calculate EV for a specific offensive play candidate
   */
  private calculateCandidateEV(
    card: PlaybookCard,
    defensePlay: DefensivePlay,
    context: EVContext,
    rngSeed: number
  ): number {
    // Simplified EV calculation - in practice would run full simulations
    // For now, use a heuristic based on play type and field position
    const baseValue = this.getBasePlayValue(card, context.gameState);
    const fieldBonus = this.getFieldPositionBonus(context.gameState.ballOn);
    const downBonus = this.getDownDistanceBonus(context.gameState);

    return baseValue + fieldBonus + downBonus;
  }

  /**
   * Get base value for different play types
   */
  private getBasePlayValue(card: PlaybookCard, gameState: GameState): number {
    const playType = this.categorizePlayType(card.label);

    switch (playType) {
      case 'pass_short': return gameState.ballOn > 50 ? 4 : 3;
      case 'pass_deep': return gameState.ballOn > 30 ? 6 : 2;
      case 'run_inside': return gameState.down <= 2 ? 3 : 2;
      case 'run_outside': return gameState.ballOn > 40 ? 4 : 2;
      case 'play_action': return gameState.ballOn > 30 ? 5 : 3;
      case 'screen': return gameState.ballOn < 50 ? 3 : 2;
      case 'trick_play': return gameState.down === 1 && gameState.ballOn > 40 ? 5 : 1;
      default: return 3;
    }
  }

  /**
   * Get field position bonus
   */
  private getFieldPositionBonus(position: number): number {
    if (position >= 80) return 2; // Red zone bonus
    if (position >= 50) return 1; // Opponent territory bonus
    if (position <= 20) return -1; // Own territory penalty
    return 0;
  }

  /**
   * Get down and distance bonus
   */
  private getDownDistanceBonus(gameState: GameState): number {
    if (gameState.down === 1 && gameState.toGo <= 10) return 1;
    if (gameState.down === 2 && gameState.toGo <= 7) return 0.5;
    if (gameState.down >= 3 && gameState.toGo <= 5) return 0.5;
    if (gameState.down >= 3 && gameState.toGo >= 8) return -0.5;
    return 0;
  }

  /**
   * Calculate defense effectiveness against predicted offense
   */
  private calculateDefenseEffectiveness(
    defenseType: string,
    predictedOffense: Map<PlaybookTendencyCategory, number>
  ): number {
    // Simplified effectiveness calculation
    let effectiveness = 0;

    for (const [offenseType, probability] of predictedOffense) {
      const matchupBonus = this.getDefenseMatchupBonus(defenseType, offenseType);
      effectiveness += probability * matchupBonus;
    }

    return effectiveness;
  }

  /**
   * Get matchup bonus for defense vs offense type
   */
  private getDefenseMatchupBonus(defenseType: string, offenseType: PlaybookTendencyCategory): number {
    // Simplified matchup matrix
    const matchups: Record<string, Record<string, number>> = {
      'blitz': { 'pass_short': 1, 'pass_deep': 2, 'run_inside': -1, 'run_outside': 0 },
      'coverage_man': { 'pass_short': -1, 'pass_deep': 1, 'run_inside': 1, 'run_outside': -1 },
      'coverage_zone': { 'pass_short': 1, 'pass_deep': -1, 'run_inside': -1, 'run_outside': 1 },
      'prevent': { 'pass_short': -2, 'pass_deep': -2, 'run_inside': 2, 'run_outside': 2 },
      'goal_line': { 'pass_short': 2, 'pass_deep': 2, 'run_inside': -1, 'run_outside': -1 }
    };

    return matchups[defenseType]?.[offenseType] || 0;
  }

  /**
   * Calculate EV for defensive play
   */
  private calculateDefenseEV(
    defensePlay: DefensivePlay,
    gameState: GameState,
    predictedOffense: Map<PlaybookTendencyCategory, number>
  ): number {
    // Simplified defensive EV calculation
    const baseValue = 3; // Base defensive value
    const fieldBonus = this.getFieldPositionBonus(gameState.ballOn);
    const effectivenessBonus = this.calculateDefenseEffectiveness(
      this.categorizeDefenseType(defensePlay),
      predictedOffense
    );

    return baseValue + fieldBonus * 0.5 + effectivenessBonus;
  }

  /**
   * Generate reasoning for play selection
   */
  private generatePlayReasoning(
    card: PlaybookCard,
    expectedValue: number,
    coachPreference: number,
    tendencyBonus: number
  ): string {
    const reasons = [];

    if (expectedValue > 4) reasons.push('high expected value');
    if (coachPreference > 0.7) reasons.push('preferred playbook');
    if (tendencyBonus > 0.1) reasons.push('successful recent pattern');

    return `Selected ${card.label}: ${reasons.join(', ')}`;
  }

  /**
   * Calculate selection temperature based on game situation and coach profile
   */
  private calculateSelectionTemperature(gameState: GameState): number {
    let temperature = 0.8; // Base temperature

    // More conservative in critical situations
    if (gameState.down >= 3 || gameState.ballOn <= 20 || gameState.ballOn >= 80) {
      temperature *= 0.7;
    }

    // Coach aggression affects temperature
    temperature *= (2 - this.coachProfile.aggression);

    // Late game situations
    if (gameState.clock <= 300) {
      temperature *= this.coachProfile.clockManagementAggression > 0.6 ? 1.2 : 0.8;
    }

    return Math.max(0.3, Math.min(1.5, temperature));
  }

  /**
   * Calculate defense selection temperature
   */
  private calculateDefenseSelectionTemperature(gameState: GameState): number {
    let temperature = 0.9;

    // More aggressive defense in opponent territory
    if (gameState.ballOn >= 50) {
      temperature *= 1.1;
    }

    // More conservative on late downs
    if (gameState.down >= 3) {
      temperature *= 0.8;
    }

    return Math.max(0.4, Math.min(1.2, temperature));
  }

  /**
   * Softmax selection for offensive plays
   */
  private softmaxSelect(candidates: PlayCandidate[], temperature: number): PlayCandidate {
    const utilities = candidates.map(c => c.utility);
    const maxUtil = Math.max(...utilities);
    const shifted = utilities.map(u => (u - maxUtil) / temperature);
    const exps = shifted.map(s => Math.exp(s));
    const sum = exps.reduce((a, b) => a + b, 0);

    let random = this.rng();
    let cumulative = 0;

    for (let i = 0; i < candidates.length; i++) {
      cumulative += exps[i]! / sum;
      if (random <= cumulative) {
        return candidates[i]!;
      }
    }

    return candidates[candidates.length - 1]!;
  }

  /**
   * Softmax selection for defensive plays
   */
  private softmaxSelectDefense(candidates: DefenseCandidate[], temperature: number): DefenseCandidate {
    const utilities = candidates.map(c => c.utility);
    const maxUtil = Math.max(...utilities);
    const shifted = utilities.map(u => (u - maxUtil) / temperature);
    const exps = shifted.map(s => Math.exp(s));
    const sum = exps.reduce((a, b) => a + b, 0);

    let random = this.rng();
    let cumulative = 0;

    for (let i = 0; i < candidates.length; i++) {
      cumulative += exps[i]! / sum;
      if (random <= cumulative) {
        return candidates[i]!;
      }
    }

    return candidates[candidates.length - 1]!;
  }
}
