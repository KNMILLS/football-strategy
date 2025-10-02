import { describe, it, expect, vi } from 'vitest';
import { DiceTagMapper, buildTagContext } from '../../../src/narration/dice/TagMapper';

describe('TagMapper - buildTagContext and mixed contexts', () => {
  const rng = vi.fn(() => 0.5);

  it('builds context with correct red zone and two-minute flags', () => {
    const mapper = new DiceTagMapper(rng);
    const gameState: any = {
      seed: 1,
      quarter: 4,
      clock: 110, // within two-minute
      down: 4,
      toGo: 1,
      ballOn: 19, // red zone
      possession: 'ai',
      awaitingPAT: false,
      gameOver: false,
      score: { player: 20, ai: 14 },
    };
    const outcome: any = { yards: 0, clock: '10', tags: [] };

    const context = buildTagContext(gameState, outcome);
    expect(context.isRedZone).toBe(true);
    expect(context.isTwoMinuteWarning).toBe(true);
    expect(context.down).toBe(4);
    expect(context.toGo).toBe(1);
    expect(context.fieldPosition).toBe(19);
    expect(context.clock).toBe(10);

    const tags = mapper.enhanceTagsWithContext([], outcome, gameState);
    expect(tags).toEqual(expect.arrayContaining(['red_zone', 'two_minute', 'fourth_down']));
  });
});


