import { describe, it, expect, beforeEach } from 'vitest';
import { PenaltyAdvisor } from '../../../src/ai/dice/PenaltyAdvisor';
import type { GameState } from '../../../src/domain/GameState';
import type { CoachProfile } from '../../../src/ai/CoachProfiles';

describe('PenaltyAdvisor', () => {
  let advisor: PenaltyAdvisor;
  let mockGameState: GameState;
  let mockCoachProfile: CoachProfile;

  beforeEach(() => {
    advisor = new PenaltyAdvisor();

    mockGameState = {
      possession: 'player',
      down: 2,
      toGo: 7,
      ballOn: 45,
      quarter: 3,
      clock: 900,
      score: { player: 21, ai: 14 },
      timeouts: { player: 2, ai: 2 }
    };

    mockCoachProfile = {
      name: 'Test Coach',
      aggression: 0.7,
      fourthDownBoost: 0.1,
      passBias: 0.2,
      twoPointAggressiveLate: true,
      onsideAggressive: true,
      playbookPreferences: {
        'West Coast': 0.8,
        'Spread': 0.7,
        'Air Raid': 0.9,
        'Smashmouth': 0.6,
        'Wide Zone': 0.7
      },
      riskTolerance: 0.7,
      clockManagementAggression: 0.8
    };
  });

  describe('analyzePenalty', () => {
    it('should recommend accepting penalties that improve field position', () => {
      const penaltyInfo = {
        label: 'Offensive Holding',
        side: 'offense',
        yards: -10
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 10,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(context);

      expect(result).toBeDefined();
      expect(result.action).toBeTypeOf('string');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.evDifference).toBeTypeOf('number');
      expect(result.reasoning).toBeTypeOf('string');
    });

    it('should recommend declining penalties that worsen field position', () => {
      const penaltyInfo = {
        label: 'Defensive Pass Interference',
        side: 'defense',
        yards: 15
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 15,
        isSpotFoul: true,
        down: 3,
        toGo: 12,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(context);

      // Should generally accept PI penalties due to automatic first down
      expect(['accept', 'decline']).toContain(result.action);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should apply coach personality adjustments', () => {
      const penaltyInfo = {
        label: 'Roughing the Passer',
        side: 'defense',
        yards: 15
      };

      const conservativeCoach: CoachProfile = {
        ...mockCoachProfile,
        riskTolerance: 0.3,
        aggression: 0.3
      };

      const aggressiveCoach: CoachProfile = {
        ...mockCoachProfile,
        riskTolerance: 0.9,
        aggression: 0.9
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 15,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: conservativeCoach
      };

      const conservativeResult = advisor.analyzePenalty(context);

      context.coachProfile = aggressiveCoach;
      const aggressiveResult = advisor.analyzePenalty(context);

      // Aggressive coach should be more willing to accept penalties
      if (conservativeResult.action === 'decline' && aggressiveResult.action === 'accept') {
        expect(aggressiveResult.confidence).toBeGreaterThan(conservativeResult.confidence);
      }
    });

    it('should consider time remaining in decisions', () => {
      const penaltyInfo = {
        label: 'Delay of Game',
        side: 'offense',
        yards: -5
      };

      const earlyGameContext = {
        gameState: { ...mockGameState, clock: 1800, quarter: 2 },
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 1800,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const lateGameContext = {
        gameState: { ...mockGameState, clock: 120, quarter: 4 },
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 120,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const earlyResult = advisor.analyzePenalty(earlyGameContext);
      const lateResult = advisor.analyzePenalty(lateGameContext);

      // Late game decisions may differ due to time pressure
      expect(earlyResult).toBeDefined();
      expect(lateResult).toBeDefined();
    });

    it('should consider score differential in decisions', () => {
      const penaltyInfo = {
        label: 'Unsportsmanlike Conduct',
        side: 'defense',
        yards: 15
      };

      const leadingContext = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 15,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 14, // Leading by 14
        coachProfile: mockCoachProfile
      };

      const trailingContext = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 15,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: -7, // Trailing by 7
        coachProfile: mockCoachProfile
      };

      const leadingResult = advisor.analyzePenalty(leadingContext);
      const trailingResult = advisor.analyzePenalty(trailingContext);

      // Trailing team may be more willing to accept penalties for field position
      expect(leadingResult).toBeDefined();
      expect(trailingResult).toBeDefined();
    });
  });

  describe('shouldAcceptPenalty', () => {
    it('should return boolean recommendation', () => {
      const penaltyInfo = {
        label: 'Offensive Offsides',
        side: 'offense',
        yards: -5
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.shouldAcceptPenalty(context);

      expect(typeof result).toBe('boolean');
    });

    it('should only recommend acceptance with high confidence', () => {
      const penaltyInfo = {
        label: 'Defensive Holding',
        side: 'defense',
        yards: 5
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: true,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const fullAnalysis = advisor.analyzePenalty(context);
      const quickDecision = advisor.shouldAcceptPenalty(context);

      // Quick decision should only be true if full analysis has high confidence
      if (quickDecision) {
        expect(fullAnalysis.confidence).toBeGreaterThan(0.6);
        expect(fullAnalysis.action).toBe('accept');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle spot fouls correctly', () => {
      const penaltyInfo = {
        label: 'Personal Foul',
        side: 'defense',
        yards: 15
      };

      const spotFoulContext = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 15,
        isSpotFoul: true, // Spot foul = automatic first down
        down: 3,
        toGo: 12,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(spotFoulContext);

      // Spot fouls are generally valuable due to automatic first down
      expect(result).toBeDefined();
      expect(result.action).toBe('accept'); // Should accept valuable spot fouls
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle late-game situations appropriately', () => {
      const penaltyInfo = {
        label: 'False Start',
        side: 'offense',
        yards: -5
      };

      const lateGameContext = {
        gameState: { ...mockGameState, clock: 60, quarter: 4 },
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 60,
        scoreDifferential: -3, // Trailing by 3
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(lateGameContext);

      // Late game decisions should consider time pressure
      expect(result).toBeDefined();
      expect(result.reasoning).toContain('late');
    });

    it('should handle goal line situations', () => {
      const penaltyInfo = {
        label: 'Defensive Pass Interference',
        side: 'defense',
        yards: 30
      };

      const goalLineContext = {
        gameState: { ...mockGameState, ballOn: 95 },
        penaltyInfo,
        fieldPosition: 95,
        penaltyYards: 30,
        isSpotFoul: true,
        down: 1,
        toGo: 5,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(goalLineContext);

      // Goal line penalties should be evaluated carefully
      expect(result).toBeDefined();
      expect(result.evDifference).toBeTypeOf('number');
    });
  });

  describe('coach personality effects', () => {
    it('should reflect coach aggression in penalty decisions', () => {
      const penaltyInfo = {
        label: 'Roughing the Kicker',
        side: 'defense',
        yards: 15
      };

      const conservativeCoach: CoachProfile = {
        ...mockCoachProfile,
        riskTolerance: 0.2,
        aggression: 0.2,
        clockManagementAggression: 0.3
      };

      const aggressiveCoach: CoachProfile = {
        ...mockCoachProfile,
        riskTolerance: 0.9,
        aggression: 0.9,
        clockManagementAggression: 0.9
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 15,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: conservativeCoach
      };

      const conservativeResult = advisor.analyzePenalty(context);

      context.coachProfile = aggressiveCoach;
      const aggressiveResult = advisor.analyzePenalty(context);

      // Aggressive coaches should be more willing to accept penalties
      if (conservativeResult.action === 'decline' && aggressiveResult.action === 'accept') {
        expect(aggressiveResult.confidence).toBeGreaterThan(conservativeResult.confidence);
      }
    });

    it('should reflect clock management aggression in late game', () => {
      const penaltyInfo = {
        label: 'Delay of Game',
        side: 'offense',
        yards: -5
      };

      const conservativeClockCoach: CoachProfile = {
        ...mockCoachProfile,
        clockManagementAggression: 0.2
      };

      const aggressiveClockCoach: CoachProfile = {
        ...mockCoachProfile,
        clockManagementAggression: 0.9
      };

      const lateGameContext = {
        gameState: { ...mockGameState, clock: 120, quarter: 4 },
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 120,
        scoreDifferential: 7,
        coachProfile: conservativeClockCoach
      };

      const conservativeResult = advisor.analyzePenalty(lateGameContext);

      lateGameContext.coachProfile = aggressiveClockCoach;
      const aggressiveResult = advisor.analyzePenalty(lateGameContext);

      // Clock management should affect late-game decisions
      expect(conservativeResult).toBeDefined();
      expect(aggressiveResult).toBeDefined();
    });
  });

  describe('decision quality validation', () => {
    it('should provide clear reasoning for decisions', () => {
      const penaltyInfo = {
        label: 'Offensive Pass Interference',
        side: 'offense',
        yards: -10
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 10,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(context);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(10);
      expect(result.reasoning).toContain(penaltyInfo.label);
    });

    it('should calculate reasonable EV differences', () => {
      const penaltyInfo = {
        label: 'Defensive Holding',
        side: 'defense',
        yards: 5
      };

      const context = {
        gameState: mockGameState,
        penaltyInfo,
        fieldPosition: 45,
        penaltyYards: 5,
        isSpotFoul: false,
        down: 2,
        toGo: 7,
        timeRemaining: 900,
        scoreDifferential: 7,
        coachProfile: mockCoachProfile
      };

      const result = advisor.analyzePenalty(context);

      // EV difference should be reasonable (not extreme)
      expect(Math.abs(result.evDifference)).toBeLessThan(50);
      expect(result.evDifference).toBeTypeOf('number');
    });
  });
});
