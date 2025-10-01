// Shared cache for data table fetchers
export const tablesCache = new Map();
export function ok(data) { return { ok: true, data }; }
export function err(code, message) { return { ok: false, error: { code, message } }; }
export function clearTablesCache() {
    tablesCache.clear();
}
export async function fetchJson(url) {
    try {
        const res = await fetch(url);
        if (!res.ok)
            return err('HTTP', `status ${res.status} for ${url}`);
        const json = (await res.json());
        return ok(json);
    }
    catch (e) {
        return err('HTTP', `failed to fetch ${url}: ${e?.message ?? String(e)}`);
    }
}
export async function getOrFetch(key, loader) {
    if (tablesCache.has(key))
        return tablesCache.get(key);
    const res = await loader();
    tablesCache.set(key, res);
    return res;
}
//# sourceMappingURL=http.js.map