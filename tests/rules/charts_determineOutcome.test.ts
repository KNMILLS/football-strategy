import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OffenseChartsSchema } from '../../src/data/schemas/OffenseCharts';
import { determineOutcomeFromCharts } from '../../src/rules/Charts';

function rngConst(v: number){ return () => v; }

describe('determineOutcomeFromCharts', () => {
  it('looks up result string and parses outcome', async () => {
    const raw = await readFile(path.resolve(process.cwd(),'data','football_strategy_all_mappings.json'),'utf8');
    const parsed = OffenseChartsSchema.parse(JSON.parse(raw));
    const charts = parsed.OffenseCharts;
    const out = determineOutcomeFromCharts({
      deckName: 'Pro Style',
      playLabel: 'Power Up Middle',
      defenseLabel: 'Inside Blitz', // 3 -> 'C'
      charts,
      rng: rngConst(0.5),
    });
    // For ProStyle/Power Up Middle vs 'C' expect +10
    expect(out.category).toBe('gain');
    expect(out.yards).toBe(10);
  });
});


