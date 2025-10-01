import { fetchJson, getOrFetch, ok, err } from './http';
import { toLongGain, LongGainSchema } from '../normalizers/longGain';
export async function fetchLongGain() {
    const key = 'data/long_gain.json';
    return getOrFetch(key, async () => {
        const jsonRes = await fetchJson(key);
        if (!jsonRes.ok)
            return jsonRes;
        const lg = toLongGain(jsonRes.data);
        if (!lg) {
            const parsed = LongGainSchema.safeParse(jsonRes.data);
            if (!parsed.success)
                return err('SCHEMA', parsed.error.message);
            return err('TRANSFORM', 'failed to extract long gain results');
        }
        return ok(lg);
    });
}
//# sourceMappingURL=longGain.js.map