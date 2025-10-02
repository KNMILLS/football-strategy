import { describe, it, expect } from 'vitest';
import { generateCommentary, generatePenaltyCommentary } from '../../src/narration/dice/CommentaryEngine';
import { DiceTagMapper } from '../../src/narration/dice/TagMapper';
import { createSeededRNG } from '../../src/sim/RNG';
import type { GameState } from '../../src/domain/GameState';

// Helper function to create a basic game state for testing
function createTestGameState(): GameState {
  return {
    quarter: 1,
    timeRemaining: 900,
    clock: 900,
    down: 1,
    toGo: 10,
    ballOn: 25,
    possession: 'player',
    score: { player: 0, ai: 0 },
    timeouts: { player: 3, ai: 3 },
    penalties: [],
    drive: {
      number: 1,
      startFieldPos: 25,
      startYardLine: 25,
      plays: [],
      yards: 0,
      timeElapsed: 0
    },
    gameLog: []
  };
}

// Helper function to create test context
function createTestContext(gameState: GameState, yards: number = 5) {
  return {
    gameState,
    yards,
    clock: 20,
    down: gameState.down,
    toGo: gameState.toGo,
    fieldPosition: gameState.ballOn,
    score: gameState.score,
    quarter: gameState.quarter,
    timeRemaining: gameState.clock,
    isRedZone: false,
    isTwoMinuteWarning: false,
    explosivePlay: yards >= 20
  };
}

describe('Commentary Variety Enhancement', () => {
  describe('Taglines Integration', () => {
    it('should use enhanced taglines for key tags with variety', () => {
      const rng = createSeededRNG(42);
      const mapper = new DiceTagMapper(rng);

      // Test each key tag from Phase G requirements
      const keyTags = [
        'sack',
        'pressure',
        'turnover:INT',
        'turnover:FUM',
        'explosive',
        'boundary',
        'checkdown',
        'coverage_bust',
        'stuff'
      ];

      for (const tag of keyTags) {
        const gameState = createTestGameState();
        const context = createTestContext(gameState);

        // Generate multiple commentaries with different seeds to test variety
        const commentaries = [];
        for (let seed = 0; seed < 10; seed++) {
          const testRng = createSeededRNG(seed);
          const commentary = generateCommentary([tag], context, testRng, 'pbp');
          commentaries.push(commentary);
        }

        // Check that we get variety (at least some different outputs)
        const uniqueCommentaries = new Set(commentaries);
        expect(uniqueCommentaries.size).toBeGreaterThan(1);

        // Check that all commentaries are non-empty
        commentaries.forEach(commentary => {
          expect(commentary.length).toBeGreaterThan(0);
        });

        console.log(`✅ ${tag}: Generated ${uniqueCommentaries.size} unique variants out of 10 attempts`);
      }
    });

    it('should maintain deterministic behavior with seeded RNG', () => {
      const gameState = createTestGameState();
      const context = createTestContext(gameState);

      const tags = ['explosive'];
      const commentaries1 = [];
      const commentaries2 = [];

      // Generate with same seed multiple times
      for (let i = 0; i < 5; i++) {
        const rng1 = createSeededRNG(123);
        const rng2 = createSeededRNG(123);

        commentaries1.push(generateCommentary(tags, context, rng1, 'pbp'));
        commentaries2.push(generateCommentary(tags, context, rng2, 'pbp'));
      }

      // Should be identical
      expect(commentaries1).toEqual(commentaries2);
    });

    it('should fall back to template system for non-key tags', () => {
      const rng = createSeededRNG(42);
      const gameState = createTestGameState();
      const context = createTestContext(gameState);

      // Test a non-key tag that should use templates
      const commentary = generateCommentary(['completion', 'short'], context, rng, 'pbp');

      expect(commentary.length).toBeGreaterThan(0);
      expect(commentary).toContain('yards'); // Should contain interpolated yardage
    });
  });

  describe('Penalty Commentary Enhancement', () => {
    it('should use enhanced penalty variants for clear penalty descriptions', () => {
      const rng = createSeededRNG(42);
      const gameState = createTestGameState();
      const context = createTestContext(gameState);

      // Test penalty commentary for different penalty types
      const penaltyTypes = [
        { label: 'Holding', side: 'offense' as const, yards: 10 },
        { label: 'False Start', side: 'offense' as const, yards: 5 },
        { label: 'Pass Interference', side: 'defense' as const, yards: 15 },
        { label: 'Offsides', side: 'defense' as const, yards: 5 },
        { label: 'Roughing', side: 'defense' as const, yards: 15 }
      ];

      for (const penalty of penaltyTypes) {
        // Generate multiple penalty commentaries to test variety
        const commentaries = [];
        for (let seed = 0; seed < 5; seed++) {
          const testRng = createSeededRNG(seed);
          const { pbp } = generatePenaltyCommentary(
            ['penalty'],
            context,
            { label: penalty.label, side: penalty.side, yards: penalty.yards } as any,
            true,
            testRng
          );
          commentaries.push(pbp);
        }

        // Check variety
        const uniqueCommentaries = new Set(commentaries);
        expect(uniqueCommentaries.size).toBeGreaterThan(1);

        console.log(`✅ ${penalty.label}: Generated ${uniqueCommentaries.size} unique penalty descriptions`);
      }
    });
  });
});
