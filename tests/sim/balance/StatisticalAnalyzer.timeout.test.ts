import { describe, it, expect, afterEach } from 'vitest';
import { StatisticalAnalyzer } from '../../../src/sim/balance/StatisticalAnalyzer';
import { createLCG } from '../../../src/sim/RNG';

describe('StatisticalAnalyzer - per-table time budget', () => {
  const originalNow = performance.now.bind(performance);

  afterEach(() => {
    // Restore performance.now after each test
    // @ts-expect-error allow reassignment for test
    performance.now = originalNow;
  });

  it('stops early when exceeding maxPerTableTime', async () => {
    // Mock performance.now to simulate time jumping past the threshold mid-loop
    let calls = 0;
    // @ts-expect-error allow reassignment for test
    performance.now = () => {
      calls += 1;
      // First few calls return small elapsed time, then jump beyond 100ms
      if (calls < 50) return 0;
      return 1000; // big jump to force early break
    };

    const analyzer = new StatisticalAnalyzer(createLCG(42));
    const requested = 10_000;
    const analysis = await analyzer.analyzeTable(
      'test/timeout',
      'Four Verts',
      'Cover 4',
      'Air Raid',
      requested
    );

    // Should not reach requested sample size due to time budget
    expect(analysis.sampleSize).toBeLessThan(requested);
    expect(analysis.sampleSize).toBeGreaterThan(0);
    // Analysis time should be > 0 due to mocked jump
    expect(analysis.analysisTime).toBeGreaterThan(0);
  });
});


