import { describe, it, expect, vi } from 'vitest';
import { SimulationRunner, type TableInfo } from '../../../src/sim/balance/SimulationRunner';

describe('SimulationRunner - progress and timeout', () => {
  it('invokes progress callback during batches', async () => {
    const config = SimulationRunner.createDefaultConfig();
    config.sampleSize = 200; // make it quick
    config.maxConcurrency = 2;
    const runner = new SimulationRunner(config);

    const progressSpy = vi.fn();
    runner.setProgressCallback(progressSpy);

    const tables: TableInfo[] = [
      { id: 't1', playbook: 'west-coast', offenseCard: 'Curl', defenseCard: 'Cover 2', filePath: 'x' },
      { id: 't2', playbook: 'air-raid', offenseCard: 'Four Verts', defenseCard: 'Cover 4', filePath: 'y' },
      { id: 't3', playbook: 'spread', offenseCard: 'Mesh', defenseCard: 'Cover 3', filePath: 'z' },
    ];

    const result = await runner.runAnalysis(tables);
    expect(result.errors).toHaveLength(0);
    expect(progressSpy).toHaveBeenCalled();
    // Should have reported total and some current ids
    const payloads = progressSpy.mock.calls.map(c => c[0]);
    expect(payloads.some(p => p.total === 3)).toBe(true);
    expect(payloads.some(p => p.current === 't1' || p.current === 't2' || p.current === 't3')).toBe(true);
  });

  it('stops analysis when exceeding timeout and reports error', async () => {
    const config = SimulationRunner.createDefaultConfig();
    config.sampleSize = 50_000; // large to encourage long run
    config.timeoutMs = 1; // immediate timeout
    const runner = new SimulationRunner(config);

    const tables: TableInfo[] = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      playbook: 'west-coast',
      offenseCard: 'Curl',
      defenseCard: 'Cover 2',
      filePath: `f${i}`,
    }));

    const result = await runner.runAnalysis(tables);
    // Expect a timeout error message present
    expect(result.errors.some(e => e.includes('timeout'))).toBe(true);
    // Analyses may be partial but not negative
    expect(result.analyses.length).toBeGreaterThanOrEqual(0);
  });
});


