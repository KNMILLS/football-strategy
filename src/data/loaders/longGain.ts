import type { Result, Err } from './Result';
import { fetchJson, getOrFetch, ok, err } from './http';
import { toLongGain, LongGainSchema, type LongGainTable } from '../normalizers/longGain';

export async function fetchLongGain(): Promise<Result<LongGainTable>> {
  const key = 'data/long_gain.json';
  return getOrFetch(key, async () => {
    const jsonRes = await fetchJson<unknown>(key);
    if (!jsonRes.ok) return jsonRes as Err;
    const lg = toLongGain(jsonRes.data);
    if (!lg) {
      const parsed = LongGainSchema.safeParse(jsonRes.data);
      if (!parsed.success) return err('SCHEMA', parsed.error.message);
      return err('TRANSFORM', 'failed to extract long gain results');
    }
    return ok(lg);
  });
}


