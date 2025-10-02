import { describe, it, expect } from 'vitest';
import { createLCG } from '../../sim/RNG';
import { DiceTagMapper } from '../../narration/dice/TagMapper';
import { generateCommentary } from '../../narration/dice/CommentaryEngine';
import type { GameState } from '../../domain/GameState';

describe('Commentary Variety Tests', () => {
  // Test that each required tag produces variety across different seeds
  const requiredTags = [
    'sack',
    'pressure',
    'turnover_INT',
    'turnover_FUM',
    'explosive',
    'boundary',
    'checkdown',
    'coverage_bust',
    'stuff'
  ];

  // Mock game state for testing
  const mockGameState: GameState = {
    seed: 12345,
    quarter: 1,
    clock: 900, // 15:00
    down: 1,
    toGo: 10,
    ballOn: 25,
    possession: 'player' as any,
    awaitingPAT: false,
    gameOver: false,
    score: { player: 0, ai: 0 } as any
  };

  it('should produce variety for each required commentary tag across different seeds', () => {
    for (const tag of requiredTags) {
      console.log(`Testing variety for tag: ${tag}`);

      const commentaryLines: string[] = [];
      const seeds = [1337, 42, 999];

      for (const seed of seeds) {
        const rng = createLCG(seed * 1000 + 123); // Use different seeds to avoid LCG issues
        const mapper = new DiceTagMapper(rng);

        // Generate commentary for this tag
        const commentary = generateCommentary([tag as any], {
          gameState: mockGameState,
          yards: tag === 'explosive' ? 25 : 0,
          clock: 10,
          down: 1,
          toGo: 10,
          fieldPosition: 25,
          score: { player: 0, ai: 0 },
          quarter: 1,
          timeRemaining: 900,
          isRedZone: false,
          isTwoMinuteWarning: false,
          explosivePlay: tag === 'explosive'
        }, rng);

        commentaryLines.push(commentary);
        console.log(`  Seed ${seed}: ${commentary}`);
      }

      // Check that we got at least 2 different lines across 3 seeds
      const uniqueLines = new Set(commentaryLines);
      expect(uniqueLines.size).toBeGreaterThanOrEqual(2);

      console.log(`  ${tag}: Generated ${uniqueLines.size} unique variants from ${commentaryLines.length} attempts`);
    }
  });

  it('should demonstrate variety for sack commentary specifically', () => {
    const sackLines: string[] = [];
    const seeds = [12345, 23456, 34567, 45678, 56789];

    for (const seed of seeds) {
      const rng = createLCG(seed);
      const commentary = generateCommentary(['sack'], {
        gameState: mockGameState,
        yards: -5,
        clock: 10,
        down: 1,
        toGo: 10,
        fieldPosition: 25,
        score: { player: 0, ai: 0 },
        quarter: 1,
        timeRemaining: 900,
        isRedZone: false,
        isTwoMinuteWarning: false,
        explosivePlay: false
      }, rng);

      sackLines.push(commentary);
    }

    // Should have multiple unique variants
    const uniqueSackLines = new Set(sackLines);
    expect(uniqueSackLines.size).toBeGreaterThan(1);

    console.log(`Sack commentary variety: ${uniqueSackLines.size} unique lines from ${sackLines.length} attempts`);
    console.log('Sample sack lines:', Array.from(uniqueSackLines).slice(0, 3));
  });

  it('should demonstrate variety for explosive commentary specifically', () => {
    const explosiveLines: string[] = [];
    const seeds = [98765, 87654, 76543, 65432, 54321];

    for (const seed of seeds) {
      const rng = createLCG(seed);
      const commentary = generateCommentary(['explosive'], {
        gameState: mockGameState,
        yards: 35,
        clock: 20,
        down: 1,
        toGo: 10,
        fieldPosition: 25,
        score: { player: 0, ai: 0 },
        quarter: 1,
        timeRemaining: 900,
        isRedZone: false,
        isTwoMinuteWarning: false,
        explosivePlay: true
      }, rng);

      explosiveLines.push(commentary);
    }

    // Should have multiple unique variants
    const uniqueExplosiveLines = new Set(explosiveLines);
    expect(uniqueExplosiveLines.size).toBeGreaterThan(1);

    console.log(`Explosive commentary variety: ${uniqueExplosiveLines.size} unique lines from ${explosiveLines.length} attempts`);
    console.log('Sample explosive lines:', Array.from(uniqueExplosiveLines).slice(0, 3));
  });

  it('should fall back gracefully when tag has no variants', () => {
    const rng = createLCG(12345);

    // Use a tag that exists but might not have variants in taglines
    const commentary = generateCommentary(['run'], {
      gameState: mockGameState,
      yards: 0,
      clock: 10,
      down: 1,
      toGo: 10,
      fieldPosition: 25,
      score: { player: 0, ai: 0 },
      quarter: 1,
      timeRemaining: 900,
      isRedZone: false,
      isTwoMinuteWarning: false,
      explosivePlay: false
    }, rng);

    // Should return a non-empty string (fallback to template system)
    expect(commentary.length).toBeGreaterThan(0);
    expect(typeof commentary).toBe('string');
  });
});
