import fs from 'node:fs/promises';
import path from 'node:path';
import { OffenseChartsSchema, type OffenseCharts } from '../../src/data/schemas/OffenseCharts';

export async function loadOffenseChartsLocal(): Promise<OffenseCharts> {
  const p = path.resolve(process.cwd(), 'data', 'football_strategy_all_mappings.json');
  const raw = await fs.readFile(p, 'utf8');
  const parsed = JSON.parse(raw);
  const oc = OffenseChartsSchema.parse(parsed).OffenseCharts;
  return oc;
}


