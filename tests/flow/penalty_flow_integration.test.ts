import { describe, it, expect } from 'vitest';
import { GameFlow } from '../../src/flow/GameFlow';
import type { GameState } from '../../src/domain/GameState';

function baseState(): GameState {
  return {
    quarter: 2,
    clock: 60,
    down: 2,
    toGo: 8,
    ballOn: 47,
    possession: 'player',
    score: { player: 0, ai: 0 },
    awaitingPAT: false,
    gameOver: false,
  } as any;
}

describe('Penalty flow integration (light)', () => {
  it('finalizePenaltyDecision applies accepted/declined and logs', () => {
    const flow = new GameFlow({ charts: {} as any, rng: () => 0.3 });
    const accepted = { ...baseState(), down: 1, toGo: 10, ballOn: 37 } as GameState;
    const declined = { ...baseState(), down: 3, toGo: 1, ballOn: 46 } as GameState;
    const finA = (flow as any).finalizePenaltyDecision(accepted, 'accept', { untimedDownScheduled: false });
    expect(finA.state.down).toBe(1);
    const finD = (flow as any).finalizePenaltyDecision(declined, 'decline', { untimedDownScheduled: false });
    expect(finD.state.down).toBe(3);
  });

  it('untimed down flag is propagated without advancing quarter', () => {
    const flow = new GameFlow({ charts: {} as any, rng: () => 0.3 });
    const pre = { ...baseState(), clock: 0 } as GameState;
    const accepted = { ...pre, down: 1, toGo: 10, ballOn: 37 } as GameState;
    const fin = (flow as any).finalizePenaltyDecision(accepted, 'accept', { untimedDownScheduled: true });
    expect((fin.state as any).untimedDownScheduled).toBe(true);
    expect(fin.state.quarter).toBe(pre.quarter);
  });
});


