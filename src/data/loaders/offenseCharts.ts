import { OffenseChartsSchema, type OffenseCharts } from '../schemas/OffenseCharts';
import type { Result, Err } from './Result';
import { fetchJson, getOrFetch, ok, err } from './http';

export async function fetchOffenseCharts(): Promise<Result<OffenseCharts>> {
  const key = 'data/football_strategy_all_mappings.json';
  return getOrFetch(key, async () => {
    const jsonRes = await fetchJson<unknown>(key);
    if (!jsonRes.ok) return jsonRes as Err;
    const parsed = OffenseChartsSchema.safeParse(jsonRes.data);
    if (!parsed.success) return err('SCHEMA', parsed.error.message);
    try {
      return ok(parsed.data.OffenseCharts);
    } catch (e: any) {
      return err('TRANSFORM', e?.message ?? 'failed to extract OffenseCharts');
    }
  });
}


