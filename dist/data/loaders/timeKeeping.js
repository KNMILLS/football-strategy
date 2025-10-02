import { TimeKeepingSchema } from '../schemas/Timekeeping';
import { fetchJson, getOrFetch, ok, err } from './http';
import { toTimeKeeping } from '../normalizers/timeKeeping';
export async function fetchTimeKeeping() {
    const key = 'data/time_keeping.json';
    return getOrFetch(key, async () => {
        const jsonRes = await fetchJson(key);
        if (!jsonRes.ok)
            return jsonRes;
        const tk = toTimeKeeping(jsonRes.data);
        if (!tk) {
            const union = TimeKeepingSchema.safeParse(jsonRes.data);
            if (!union.success)
                return err('SCHEMA', union.error.message);
            return err('TRANSFORM', 'failed to normalize timekeeping table');
        }
        return ok(tk);
    });
}
//# sourceMappingURL=timeKeeping.js.map