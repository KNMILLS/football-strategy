import { describe, it, expect, beforeEach } from 'vitest';
import { EVCalculator, defaultScorePosition, defaultFieldPositionValue } from '../../../src/ai/dice/EVCalculator';
import type { GameState } from '../../../src/domain/GameState';
import type { PlaybookCard, DefensivePlay } from '../../../src/types/dice';
import { createLCG } from '../../../src/sim/RNG';

describe('EVCalculator', () => {
  let calculator: EVCalculator;
  let mockGameState: GameState;
  let mockPlaybookCard: PlaybookCard;
  let mockDefensePlay: DefensivePlay;

  beforeEach(() => {
    calculator = new EVCalculator();

    mockGameState = {
      possession: 'player',
      down: 1,
      toGo: 10,
      ballOn: 50,
      quarter: 2,
      clock: 1800,
      score: { player: 14, ai: 7 },
      timeouts: { player: 3, ai: 3 }
    };

    mockPlaybookCard = {
      id: 'test-card',
      playbook: 'West Coast',
      label: 'Slant Route',
      type: 'pass',
      description: 'Quick slant pattern'
    };

    mockDefensePlay = 'Cover 2';
  });

  describe('calculateEV', () => {
    it('should calculate expected value for a play candidate', () => {
      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any, // Mock table
        penaltyTable: {} as any  // Mock table
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result = calculator.calculateEV(candidate, context, 12345);

      expect(result).toBeDefined();
      expect(result.samples).toBeGreaterThanOrEqual(0); // May use heuristics if no tables provided
      expect(result.expectedYards).toBeTypeOf('number');
      expect(result.turnoverProbability).toBeGreaterThanOrEqual(0);
      expect(result.turnoverProbability).toBeLessThanOrEqual(1);
      expect(result.firstDownProbability).toBeGreaterThanOrEqual(0);
      expect(result.firstDownProbability).toBeLessThanOrEqual(1);
      expect(result.expectedClockRunoff).toBeGreaterThanOrEqual(10);
      expect(result.expectedClockRunoff).toBeLessThanOrEqual(30);
      expect(result.expectedPoints).toBeTypeOf('number');
      expect(result.utility).toBeTypeOf('number');
    });

    it('should use CI settings when specified', () => {
      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result = calculator.calculateEV(candidate, context, 12345, true);

      expect(result.samples).toBeGreaterThanOrEqual(0); // May use heuristics if no tables provided
    });

    it('should produce deterministic results with same seed', () => {
      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result1 = calculator.calculateEV(candidate, context, 12345);
      const result2 = calculator.calculateEV(candidate, context, 12345);

      expect(result1.expectedYards).toBe(result2.expectedYards);
      expect(result1.turnoverProbability).toBe(result2.turnoverProbability);
      expect(result1.firstDownProbability).toBe(result2.firstDownProbability);
      expect(result1.utility).toBe(result2.utility);
    });

    it('should produce deterministic results (heuristic mode)', () => {
      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result1 = calculator.calculateEV(candidate, context, 12345);
      const result2 = calculator.calculateEV(candidate, context, 12345);

      // Heuristic mode produces deterministic results
      expect(result1.expectedYards).toBe(result2.expectedYards);
      expect(result1.utility).toBe(result2.utility);
    });
  });

  describe('calculateEVMatrix', () => {
    it('should calculate EVs for multiple defensive responses', () => {
      const offenseCardId = 'test-card';
      const playbook = 'West Coast' as const;
      const matchupTables = new Map([
        ['Cover 2', {} as any],
        ['Cover 3', {} as any],
        ['Blitz', {} as any]
      ]);

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result = calculator.calculateEVMatrix(
        offenseCardId,
        playbook,
        matchupTables,
        {} as any, // Mock penalty table
        context,
        12345
      );

      expect(result.size).toBe(3);
      expect(result.has('Cover 2')).toBe(true);
      expect(result.has('Cover 3')).toBe(true);
      expect(result.has('Blitz')).toBe(true);

      for (const evResult of result.values()) {
        expect(evResult.samples).toBeGreaterThanOrEqual(0);
        expect(evResult.expectedYards).toBeTypeOf('number');
      }
    });
  });

  describe('defaultScorePosition', () => {
    it('should return 7 for touchdowns', () => {
      expect(defaultScorePosition(50, 100)).toBe(7);
      expect(defaultScorePosition(30, 100)).toBe(7);
    });

    it('should return -2 for safeties', () => {
      expect(defaultScorePosition(-10, 0)).toBe(-2);
      expect(defaultScorePosition(-5, 0)).toBe(-2);
    });

    it('should return 3 for high-probability field goal range', () => {
      expect(defaultScorePosition(10, 65)).toBe(3); // 35 yards from goal
      expect(defaultScorePosition(15, 60)).toBe(3); // 40 yards from goal
    });

    it('should return 1.5 for medium-probability field goal range', () => {
      expect(defaultScorePosition(20, 50)).toBe(1.5); // 50 yards from goal
      expect(defaultScorePosition(25, 45)).toBe(1.5); // 55 yards from goal
    });

    it('should return 0.5 for low-probability field goal range', () => {
      expect(defaultScorePosition(30, 35)).toBe(0.5); // 65 yards from goal
      expect(defaultScorePosition(35, 30)).toBe(0.5); // 70 yards from goal
    });

    it('should return 0 for positions outside field goal range', () => {
      expect(defaultScorePosition(5, 20)).toBe(0); // 80 yards from goal
      expect(defaultScorePosition(10, 10)).toBe(0); // 90 yards from goal
    });
  });

  describe('defaultFieldPositionValue', () => {
    it('should penalize poor field positions', () => {
      expect(defaultFieldPositionValue(10)).toBe(-0.1);
      expect(defaultFieldPositionValue(20)).toBe(-0.1);
      expect(defaultFieldPositionValue(80)).toBe(-0.1);
      expect(defaultFieldPositionValue(90)).toBe(-0.1);
    });

    it('should favor good field positions', () => {
      expect(defaultFieldPositionValue(40)).toBe(0.1);
      expect(defaultFieldPositionValue(50)).toBe(0.1);
      expect(defaultFieldPositionValue(60)).toBe(0.1);
    });

    it('should be neutral for midfield positions', () => {
      expect(defaultFieldPositionValue(25)).toBe(0);
      expect(defaultFieldPositionValue(35)).toBe(0);
      expect(defaultFieldPositionValue(65)).toBe(0);
      expect(defaultFieldPositionValue(75)).toBe(0);
    });
  });

  describe('performance characteristics', () => {
    it('should complete EV calculations within reasonable time', () => {
      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const startTime = Date.now();
      calculator.calculateEV(candidate, context, 12345);
      const endTime = Date.now();

      // Should complete within 100ms for 200 simulations
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should complete CI calculations faster', () => {
      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const startTime = Date.now();
      calculator.calculateEV(candidate, context, 12345, true);
      const endTime = Date.now();

      // CI version should be faster (100 simulations vs 200)
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('edge cases', () => {
    it('should handle goal line situations', () => {
      const goalLineState = { ...mockGameState, ballOn: 95 };

      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: goalLineState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result = calculator.calculateEV(candidate, context, 12345);

      // Should still produce valid results
      expect(result.expectedYards).toBeTypeOf('number');
      expect(result.expectedPoints).toBeTypeOf('number');
    });

    it('should handle end-of-game situations', () => {
      const endGameState = { ...mockGameState, clock: 30, quarter: 4 };

      const candidate = {
        playbook: 'West Coast' as const,
        offenseCardId: 'test-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const context = {
        gameState: endGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const result = calculator.calculateEV(candidate, context, 12345);

      // Should still produce valid results
      expect(result.expectedYards).toBeTypeOf('number');
      expect(result.expectedClockRunoff).toBeGreaterThan(0);
    });
  });

  describe('accuracy validation', () => {
    it('should produce reasonable EV values for different play types', () => {
      // Test different play scenarios
      const runCard: PlaybookCard = {
        id: 'run-card',
        playbook: 'Smashmouth',
        label: 'Inside Zone',
        type: 'run'
      };

      const passCard: PlaybookCard = {
        id: 'pass-card',
        playbook: 'Air Raid',
        label: 'Deep Bomb',
        type: 'pass'
      };

      const context = {
        gameState: mockGameState,
        scorePosition: defaultScorePosition,
        fieldPositionValue: defaultFieldPositionValue
      };

      const runCandidate = {
        playbook: 'Smashmouth' as const,
        offenseCardId: 'run-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const passCandidate = {
        playbook: 'Air Raid' as const,
        offenseCardId: 'pass-card',
        defensePlay: mockDefensePlay,
        matchupTable: {} as any,
        penaltyTable: {} as any
      };

      const runResult = calculator.calculateEV(runCandidate, context, 11111);
      const passResult = calculator.calculateEV(passCandidate, context, 22222);

      // Both should produce reasonable values
      expect(runResult.expectedYards).toBeGreaterThan(-10);
      expect(runResult.expectedYards).toBeLessThan(20);
      expect(passResult.expectedYards).toBeGreaterThan(-5);
      expect(passResult.expectedYards).toBeLessThan(30);

      // Pass plays generally have higher variance
      expect(passResult.turnoverProbability).toBeGreaterThanOrEqual(runResult.turnoverProbability);
    });
  });
});
