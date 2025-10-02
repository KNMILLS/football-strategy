import { describe, it, expect, vi } from 'vitest';
import { DiceTagMapper, buildTagContext, isInRedZone, isTwoMinuteWarning } from '../../../src/narration/dice/TagMapper';
import type { DiceOutcome, GameState } from '../../../src';

describe('DiceTagMapper', () => {
  const mockRng = vi.fn(() => 0.5);

  describe('enhanceTagsWithContext', () => {
    it('should add red zone tag when in red zone', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 2,
        clock: 300,
        down: 1,
        toGo: 10,
        ballOn: 15, // Inside red zone for player possession
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 7, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 5,
        clock: '10',
        tags: ['completion', 'short']
      };

      const enhanced = mapper.enhanceTagsWithContext(outcome.tags, outcome, gameState);
      expect(enhanced).toContain('red_zone');
    });

    it('should add two minute warning tag when appropriate', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 2,
        clock: 90, // Under 2 minutes in Q2
        down: 1,
        toGo: 10,
        ballOn: 50,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 7, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 5,
        clock: '10',
        tags: ['completion', 'short']
      };

      const enhanced = mapper.enhanceTagsWithContext(outcome.tags, outcome, gameState);
      expect(enhanced).toContain('two_minute');
    });

    it('should add first down tag when converting', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 1,
        clock: 600,
        down: 3,
        toGo: 5,
        ballOn: 50,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 8, // More than toGo, so first down
        clock: '10',
        tags: ['completion', 'short']
      };

      const enhanced = mapper.enhanceTagsWithContext(outcome.tags, outcome, gameState);
      expect(enhanced).toContain('first_down');
    });

    it('should add explosive tag for big plays', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 1,
        clock: 600,
        down: 1,
        toGo: 10,
        ballOn: 50,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 25, // Explosive play
        clock: '20',
        tags: ['completion', 'deep']
      };

      const enhanced = mapper.enhanceTagsWithContext(outcome.tags, outcome, gameState);
      expect(enhanced).toContain('explosive');
    });
  });

  describe('generateDiceOutcomeCommentary', () => {
    it('should generate basic completion commentary', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 1,
        clock: 600,
        down: 1,
        toGo: 10,
        ballOn: 50,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 8,
        clock: '10',
        tags: ['completion', 'short']
      };

      const commentary = mapper.generateDiceOutcomeCommentary(outcome, gameState);
      expect(commentary.pbp).toBeDefined();
      expect(commentary.analyst).toBeDefined();
      expect(commentary.pbp).toContain('8'); // Should contain yardage
    });

    it('should handle turnover commentary', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 1,
        clock: 600,
        down: 1,
        toGo: 10,
        ballOn: 50,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 0,
        clock: '10',
        tags: ['turnover', 'interception'],
        turnover: {
          type: 'INT',
          return_yards: 15,
          return_to: 'LOS'
        }
      };

      const commentary = mapper.generateDiceOutcomeCommentary(outcome, gameState);
      expect(commentary.pbp).toContain('Interception');
      expect(commentary.pbp).toContain('15'); // Return yards
    });

    it('should handle out of bounds plays', () => {
      const mapper = new DiceTagMapper(mockRng);
      const gameState: GameState = {
        seed: 123,
        quarter: 1,
        clock: 600,
        down: 1,
        toGo: 10,
        ballOn: 50,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      };

      const outcome: DiceOutcome = {
        yards: 12,
        clock: '10',
        tags: ['completion', 'deep'],
        oob: true
      };

      const commentary = mapper.generateDiceOutcomeCommentary(outcome, gameState);
      expect(commentary.pbp).toContain('out of bounds');
    });
  });

  describe('formatting utilities', () => {
    it('should format field position correctly', () => {
      const mapper = new DiceTagMapper(mockRng);

      expect(mapper.formatFieldPosition('player', 15)).toBe('HOME 15');
      expect(mapper.formatFieldPosition('player', 55)).toBe('HOME 45 (opp)');
      expect(mapper.formatFieldPosition('ai', 15)).toBe('AWAY 15');
    });

    it('should format down and distance correctly', () => {
      const mapper = new DiceTagMapper(mockRng);

      expect(mapper.formatDownAndDistance(1, 10)).toBe('First and 10');
      expect(mapper.formatDownAndDistance(3, 7)).toBe('Third and 7');
      expect(mapper.formatDownAndDistance(4, 2)).toBe('Fourth and 2');
    });

    it('should format clock correctly', () => {
      const mapper = new DiceTagMapper(mockRng);

      expect(mapper.formatClock(600)).toBe('10:00');
      expect(mapper.formatClock(125)).toBe('2:05');
      expect(mapper.formatClock(5)).toBe('0:05');
    });

    it('should format score correctly', () => {
      const mapper = new DiceTagMapper(mockRng);

      expect(mapper.formatScore({ player: 14, ai: 7 })).toBe('HOME 14 – AWAY 7');
      expect(mapper.formatScore({ player: 0, ai: 0 })).toBe('HOME 0 – AWAY 0');
    });
  });

  describe('context helpers', () => {
    it('should detect red zone correctly', () => {
      expect(isInRedZone(15, 'player')).toBe(true); // Player at 15 (opp 85, within 20)
      expect(isInRedZone(85, 'player')).toBe(true); // Player at 85 (opp 15, within 20)
      expect(isInRedZone(25, 'player')).toBe(false); // Player at 25 (opp 75, outside 20)
      expect(isInRedZone(15, 'ai')).toBe(true); // AI at 15 (within 20 of player goal)
      expect(isInRedZone(85, 'ai')).toBe(true); // AI at 85 (within 20 of AI goal)
    });

    it('should detect two minute warning correctly', () => {
      expect(isTwoMinuteWarning(2, 90)).toBe(true); // Q2, under 2 minutes
      expect(isTwoMinuteWarning(4, 90)).toBe(true); // Q4, under 2 minutes
      expect(isTwoMinuteWarning(1, 90)).toBe(false); // Q1, under 2 minutes
      expect(isTwoMinuteWarning(2, 150)).toBe(false); // Q2, over 2 minutes
    });
  });
});
