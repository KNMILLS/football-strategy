import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OffenseChartsSchema } from '../../src/data/schemas/OffenseCharts';

describe('data schema: football_strategy_all_mappings.json', () => {
  it('validates against OffenseChartsSchema', async () => {
    const p = path.resolve(process.cwd(), 'data', 'football_strategy_all_mappings.json');
    const raw = await readFile(p, 'utf8');
    const json = JSON.parse(raw);
    const res = OffenseChartsSchema.safeParse(json);
    if (!res.success) {
      const err = res.error.issues[0];
      throw new Error(`${err.path.join('.')}: ${err.message}`);
    }
    // Ensure expected keys exist
    expect(Object.keys(res.data.OffenseCharts)).toEqual(
      expect.arrayContaining(['ProStyle', 'BallControl', 'AerialStyle'])
    );
  });
});
