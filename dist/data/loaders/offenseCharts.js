import { OffenseChartsSchema } from '../schemas/OffenseCharts';
import { fetchJson, getOrFetch, ok, err } from './http';
export async function fetchOffenseCharts() {
    const key = 'data/football_strategy_all_mappings.json';
    return getOrFetch(key, async () => {
        const jsonRes = await fetchJson(key);
        if (!jsonRes.ok)
            return jsonRes;
        const parsed = OffenseChartsSchema.safeParse(jsonRes.data);
        if (!parsed.success)
            return err('SCHEMA', parsed.error.message);
        try {
            return ok(parsed.data.OffenseCharts);
        }
        catch (e) {
            return err('TRANSFORM', e?.message ?? 'failed to extract OffenseCharts');
        }
    });
}
//# sourceMappingURL=offenseCharts.js.map