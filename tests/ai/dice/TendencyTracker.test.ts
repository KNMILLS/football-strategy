import { describe, it, expect, beforeEach } from 'vitest';
import { TendencyTracker } from '../../../src/ai/dice/TendencyTracker';
import type { GameState } from '../../../src/domain/GameState';

describe('TendencyTracker', () => {
  let tracker: TendencyTracker;
  let mockGameState: GameState;

  beforeEach(() => {
    tracker = new TendencyTracker();

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
  });

  describe('recordOutcome', () => {
    it('should record play outcomes for tendency tracking', () => {
      tracker.recordOutcome(
        'West Coast',
        'pass_short',
        'coverage_man',
        mockGameState,
        8,
        true
      );

      const recentPatterns = tracker.getRecentPatterns(1);
      expect(recentPatterns).toHaveLength(1);
      expect(recentPatterns[0].playType).toBe('pass_short');
      expect(recentPatterns[0].defenseType).toBe('coverage_man');
      expect(recentPatterns[0].yards).toBe(8);
      expect(recentPatterns[0].success).toBe(true);
    });

    it('should handle multiple outcomes correctly', () => {
      // Record several outcomes
      for (let i = 0; i < 5; i++) {
        tracker.recordOutcome(
          'West Coast',
          'pass_short',
          'coverage_man',
          mockGameState,
          10 + i,
          i % 2 === 0 // Alternate success/failure
        );
      }

      const recentPatterns = tracker.getRecentPatterns(5);
      expect(recentPatterns).toHaveLength(5);
      expect(recentPatterns.every(p => p.playType === 'pass_short')).toBe(true);
    });

    it('should limit pattern history', () => {
      // Record more patterns than the limit
      for (let i = 0; i < 1500; i++) {
        tracker.recordOutcome(
          'West Coast',
          'pass_short',
          'coverage_man',
          mockGameState,
          10,
          true
        );
      }

      const recentPatterns = tracker.getRecentPatterns();
      expect(recentPatterns.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getPlaybookTendency', () => {
    it('should return null for unseen tendencies', () => {
      const tendency = tracker.getPlaybookTendency('West Coast', 'pass_short');
      expect(tendency).toBeNull();
    });

    it('should return tendency data after recording outcomes', () => {
      // Record some outcomes
      tracker.recordOutcome(
        'West Coast',
        'pass_short',
        'coverage_man',
        mockGameState,
        12,
        true
      );

      tracker.recordOutcome(
        'West Coast',
        'pass_short',
        'coverage_man',
        mockGameState,
        8,
        false
      );

      const tendency = tracker.getPlaybookTendency('West Coast', 'pass_short');

      expect(tendency).not.toBeNull();
      expect(tendency!.count).toBe(2);
      expect(tendency!.successRate).toBeGreaterThan(0); // Should be positive after mixed results
      expect(tendency!.successRate).toBeLessThan(1);
      expect(tendency!.trend).toBeTypeOf('string');
    });
  });

  describe('getDefensiveTendency', () => {
    it('should return null for unseen defensive tendencies', () => {
      const tendency = tracker.getDefensiveTendency('blitz');
      expect(tendency).toBeNull();
    });

    it('should return tendency data after recording outcomes', () => {
      tracker.recordOutcome(
        'West Coast',
        'pass_short',
        'blitz',
        mockGameState,
        5,
        true
      );

      const tendency = tracker.getDefensiveTendency('blitz');

      expect(tendency).not.toBeNull();
      expect(tendency!.count).toBe(1);
      expect(tendency!.successRate).toBeGreaterThan(0); // Should be positive after success
    });
  });

  describe('analyzeSituation', () => {
    it('should analyze game situations for recommendations', () => {
      // Record some outcomes in similar situations
      for (let i = 0; i < 10; i++) {
        tracker.recordOutcome(
          'West Coast',
          'pass_short',
          'coverage_man',
          { ...mockGameState, ballOn: 45, down: 2, toGo: 8 },
          12,
          true
        );
      }

      const analysis = tracker.analyzeSituation(
        { ...mockGameState, ballOn: 45, down: 2, toGo: 8 },
        'West Coast'
      );

      expect(analysis).toBeDefined();
      expect(analysis.recommendedPlays).toBeTypeOf('object');
      expect(analysis.defensiveWeaknesses).toBeTypeOf('object');
    });

    it('should return empty recommendations when no data available', () => {
      const analysis = tracker.analyzeSituation(mockGameState, 'West Coast');

      expect(analysis.recommendedPlays).toEqual([]);
      expect(analysis.defensiveWeaknesses).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all tendency data', () => {
      // Record some data
      tracker.recordOutcome(
        'West Coast',
        'pass_short',
        'coverage_man',
        mockGameState,
        10,
        true
      );

      expect(tracker.getPlaybookTendency('West Coast', 'pass_short')).not.toBeNull();

      // Reset
      tracker.reset();

      // Should be empty now
      expect(tracker.getPlaybookTendency('West Coast', 'pass_short')).toBeNull();
      expect(tracker.getRecentPatterns()).toEqual([]);
    });
  });

  describe('pattern categorization', () => {
    it('should categorize field positions correctly', () => {
      // This tests the private getFieldZone method indirectly
      const ownTerritoryState = { ...mockGameState, ballOn: 15 };
      const midfieldState = { ...mockGameState, ballOn: 50 };
      const oppTerritoryState = { ...mockGameState, ballOn: 75 };
      const redZoneState = { ...mockGameState, ballOn: 90 };

      tracker.recordOutcome('West Coast', 'pass_short', 'coverage_man', ownTerritoryState, 10, true);
      tracker.recordOutcome('West Coast', 'pass_short', 'coverage_man', midfieldState, 10, true);
      tracker.recordOutcome('West Coast', 'pass_short', 'coverage_man', oppTerritoryState, 10, true);
      tracker.recordOutcome('West Coast', 'pass_short', 'coverage_man', redZoneState, 10, true);

      const patterns = tracker.getRecentPatterns(4);
      expect(patterns).toHaveLength(4);
      expect(patterns[0].fieldPosition).toBe(15); // Own territory
      expect(patterns[1].fieldPosition).toBe(50); // Midfield
      expect(patterns[2].fieldPosition).toBe(75); // Opponent territory
      expect(patterns[3].fieldPosition).toBe(90); // Red zone
    });

    it('should categorize down and distance correctly', () => {
      const shortYardageState = { ...mockGameState, down: 3, toGo: 2 };
      const longYardageState = { ...mockGameState, down: 2, toGo: 15 };

      tracker.recordOutcome('West Coast', 'run_inside', 'goal_line', shortYardageState, 3, true);
      tracker.recordOutcome('West Coast', 'pass_deep', 'coverage_zone', longYardageState, 20, true);

      const patterns = tracker.getRecentPatterns(2);
      expect(patterns).toHaveLength(2);
      expect(patterns[0].down).toBe(3);
      expect(patterns[0].toGo).toBe(2);
      expect(patterns[1].down).toBe(2);
      expect(patterns[1].toGo).toBe(15);
    });
  });
});
