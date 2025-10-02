import { describe, it, expect, vi } from 'vitest';
import {
  generateCommentary,
  generatePenaltyCommentary,
  generateTurnoverReturnCommentary,
  generateOOBCommentary,
  COMMENTARY_TEMPLATES,
  ANALYST_TEMPLATES
} from '../../../src/narration/dice/CommentaryEngine';
import type { TagContext } from '../../../src/narration/dice/TagMapper';

describe('CommentaryEngine', () => {
  const mockRng = vi.fn(() => 0.0); // Always return first variant for consistent snapshots
  const baseContext: TagContext = {
    gameState: {
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
    },
    yards: 8,
    clock: 10,
    down: 1,
    toGo: 10,
    fieldPosition: 50,
    score: { player: 0, ai: 0 },
    quarter: 1,
    timeRemaining: 600,
    isRedZone: false,
    isTwoMinuteWarning: false,
    explosivePlay: false
  };

  describe('generateCommentary', () => {
    it('should generate consistent play-by-play commentary for completion', () => {
      const commentary = generateCommentary(['completion', 'short'], baseContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent analyst commentary for completion', () => {
      const commentary = generateCommentary(['completion', 'short'], baseContext, mockRng, 'analyst');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for deep completion', () => {
      const commentary = generateCommentary(['completion', 'deep'], baseContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for incompletion', () => {
      const commentary = generateCommentary(['incompletion'], baseContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for turnover', () => {
      const commentary = generateCommentary(['turnover', 'interception'], baseContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for explosive play', () => {
      const explosiveContext = { ...baseContext, yards: 25, explosivePlay: true };
      const commentary = generateCommentary(['completion', 'deep', 'explosive'], explosiveContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for run play', () => {
      const commentary = generateCommentary(['run', 'inside_run'], baseContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for red zone situation', () => {
      const redZoneContext = { ...baseContext, isRedZone: true };
      const commentary = generateCommentary(['completion', 'short', 'red_zone'], redZoneContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for two-minute situation', () => {
      const twoMinuteContext = { ...baseContext, isTwoMinuteWarning: true };
      const commentary = generateCommentary(['completion', 'short', 'two_minute'], twoMinuteContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should fallback to generic commentary when no template matches', () => {
      const commentary = generateCommentary(['unknown_tag'], baseContext, mockRng, 'pbp');
      expect(commentary).toBe('Gain of 8 yards.');
    });

    it('should handle negative yards correctly', () => {
      const negativeContext = { ...baseContext, yards: -3 };
      const commentary = generateCommentary(['run', 'inside_run'], negativeContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });

    it('should handle zero yards correctly', () => {
      const zeroContext = { ...baseContext, yards: 0 };
      const commentary = generateCommentary(['run', 'inside_run'], zeroContext, mockRng, 'pbp');
      expect(commentary).toMatchSnapshot();
    });
  });

  describe('generatePenaltyCommentary', () => {
    const penaltyInfo = {
      side: 'offense' as const,
      yards: 10,
      label: 'Offensive Holding',
      override_play_result: true
    };

    it('should generate consistent commentary for accepted offensive penalty', () => {
      const commentary = generatePenaltyCommentary(['penalty', 'holding'], baseContext, penaltyInfo, true, mockRng);
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for declined penalty', () => {
      const commentary = generatePenaltyCommentary(['penalty', 'holding'], baseContext, penaltyInfo, false, mockRng);
      expect(commentary).toMatchSnapshot();
    });

    it('should handle defensive penalty correctly', () => {
      const defPenaltyInfo = { ...penaltyInfo, side: 'defense' as const };
      const commentary = generatePenaltyCommentary(['penalty'], baseContext, defPenaltyInfo, true, mockRng);
      expect(commentary).toMatchSnapshot();
    });
  });

  describe('generateTurnoverReturnCommentary', () => {
    it('should generate consistent commentary for interception with return', () => {
      const commentary = generateTurnoverReturnCommentary(['turnover', 'interception'], baseContext, 15, mockRng);
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for fumble with no return', () => {
      const commentary = generateTurnoverReturnCommentary(['turnover', 'fumble'], baseContext, 0, mockRng);
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for long return', () => {
      const commentary = generateTurnoverReturnCommentary(['turnover', 'interception'], baseContext, 35, mockRng);
      expect(commentary).toMatchSnapshot();
    });
  });

  describe('generateOOBCommentary', () => {
    it('should generate consistent commentary for out of bounds completion', () => {
      const commentary = generateOOBCommentary(['completion', 'deep'], baseContext, mockRng);
      expect(commentary).toMatchSnapshot();
    });

    it('should generate consistent commentary for out of bounds incompletion', () => {
      const zeroYardContext = { ...baseContext, yards: 0 };
      const commentary = generateOOBCommentary(['incompletion'], zeroYardContext, mockRng);
      expect(commentary).toMatchSnapshot();
    });
  });

  describe('template selection', () => {
    it('should select highest priority template when multiple match', () => {
      // Create a scenario where multiple templates could match
      const highPriorityContext = { ...baseContext, yards: 25, explosivePlay: true };
      const commentary = generateCommentary(['completion', 'deep', 'explosive'], highPriorityContext, mockRng, 'pbp');

      // Should select explosive template (priority 18) over deep completion (priority 15)
      expect(commentary).toContain('Explosive play');
    });

    it('should respect template conditions', () => {
      const redZoneContext = { ...baseContext, isRedZone: true };
      const commentary = generateCommentary(['completion', 'short'], redZoneContext, mockRng, 'pbp');

      // Should potentially include red zone commentary due to condition
      expect(commentary.length).toBeGreaterThan(0);
    });

    it('should handle template interpolation correctly', () => {
      const contextWithVars = { ...baseContext, yards: 12, down: 3, toGo: 5 };
      const commentary = generateCommentary(['completion', 'intermediate'], contextWithVars, mockRng, 'pbp');

      // Should not contain template variables like ${yards}
      expect(commentary).not.toContain('${');
    });
  });

  describe('deterministic behavior', () => {
    it('should produce same results with same RNG values', () => {
      const rng1 = vi.fn(() => 0.2);
      const rng2 = vi.fn(() => 0.2);

      const commentary1 = generateCommentary(['completion', 'short'], baseContext, rng1, 'pbp');
      const commentary2 = generateCommentary(['completion', 'short'], baseContext, rng2, 'pbp');

      expect(commentary1).toBe(commentary2);
    });

    it('should produce different results with different RNG values', () => {
      const rng1 = vi.fn(() => 0.0);
      const rng2 = vi.fn(() => 0.9);

      const commentary1 = generateCommentary(['completion', 'short'], baseContext, rng1, 'pbp');
      const commentary2 = generateCommentary(['completion', 'short'], baseContext, rng2, 'pbp');

      // Should be different variants of the same template
      expect(commentary1).not.toBe(commentary2);
    });
  });
});
