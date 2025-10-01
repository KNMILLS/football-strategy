import { PlaceKickTableSchema } from '../schemas/PlaceKicking';
import { fetchJson, getOrFetch, ok, err } from './http';
import { toPlaceKickTable } from '../normalizers/placeKicking';
export async function fetchPlaceKicking() {
    const key = 'data/place_kicking.json';
    return getOrFetch(key, async () => {
        const jsonRes = await fetchJson(key);
        if (!jsonRes.ok)
            return jsonRes;
        // Accept rich or normalized, transform to normalized if needed
        const normalized = toPlaceKickTable(jsonRes.data);
        if (!normalized) {
            // Try to indicate if schema vs transform: first check union schema
            const union = PlaceKickTableSchema.safeParse(jsonRes.data);
            if (!union.success)
                return err('SCHEMA', union.error.message);
            return err('TRANSFORM', 'failed to normalize place-kicking table');
        }
        return ok(normalized);
    });
}
//# sourceMappingURL=placeKicking.js.map