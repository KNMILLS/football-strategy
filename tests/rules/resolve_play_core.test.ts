import { describe, it, expect } from 'vitest';
import { resolvePlayCore } from '../../src/rules/ResolvePlayCore';
import { createLCG } from '../../src/sim/RNG';
import { OffenseChartsSchema } from '../../src/data/schemas/OffenseCharts';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function loadChartsSync() {
  // In tests, read synchronously via async/await caller
}

describe('resolvePlayCore', async () => {
  const charts = OffenseChartsSchema.parse(JSON.parse(await readFile(path.resolve(process.cwd(),'data','football_strategy_all_mappings.json'),'utf8'))).OffenseCharts;
  it('applies yards and resets downs on first down', () => {
    const rng = createLCG(42);
    const state = { seed: 42, quarter: 1, clock: 15*60, down: 1, toGo: 5, ballOn: 50, possession: 'player' as const, awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } };
    const res = resolvePlayCore({ state, charts, deckName: 'Pro Style', playLabel: 'Power Up Middle', defenseLabel: 'Inside Blitz', rng });
    // ProStyle PUM vs C is +10: first down
    expect(res.state.down).toBe(1);
    expect(res.state.toGo).toBe(10);
    expect(res.state.ballOn).toBe(60);
  });
  it('increments down on incomplete', () => {
    const rng = createLCG(42);
    const state = { seed: 42, quarter: 1, clock: 15*60, down: 2, toGo: 10, ballOn: 40, possession: 'player' as const, awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } };
    // Choose a pass play where result includes Incomplete: Screen Pass vs 'Passing'(7->G) is Incomplete
    const res = resolvePlayCore({ state, charts, deckName: 'Pro Style', playLabel: 'Screen Pass', defenseLabel: 'Passing', rng });
    expect(res.state.down).toBe(3);
    expect(res.state.ballOn).toBe(40);
  });
  it('flips possession on interception', () => {
    const rng = createLCG(42);
    const state = { seed: 42, quarter: 1, clock: 15*60, down: 3, toGo: 8, ballOn: 35, possession: 'player' as const, awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } };
    // Down & In Pass vs 'Pass & Run'(6->F) is INTERCEPT Def -30
    const res = resolvePlayCore({ state, charts, deckName: 'Pro Style', playLabel: 'Down & In Pass', defenseLabel: 'Pass & Run', rng });
    expect(res.possessionChanged).toBe(true);
    expect(res.state.possession).toBe('ai');
  });
});
