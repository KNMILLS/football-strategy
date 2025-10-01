import { TimeKeepingSchema, type TimeKeeping } from '../schemas/Timekeeping';
import type { Result, Err } from './Result';
import { fetchJson, getOrFetch, ok, err } from './http';
import { toTimeKeeping } from '../normalizers/timeKeeping';

export async function fetchTimeKeeping(): Promise<Result<TimeKeeping>> {
  const key = 'data/time_keeping.json';
  return getOrFetch(key, async () => {
    const jsonRes = await fetchJson<unknown>(key);
    if (!jsonRes.ok) return jsonRes as Err;
    const tk = toTimeKeeping(jsonRes.data);
    if (!tk) {
      const union = TimeKeepingSchema.safeParse(jsonRes.data);
      if (!union.success) return err('SCHEMA', union.error.message);
      return err('TRANSFORM', 'failed to normalize timekeeping table');
    }
    return ok(tk);
  });
}


