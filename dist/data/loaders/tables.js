import { z } from 'zod';
import { loadJson } from './JsonLoader';
import { OffenseChartsSchema } from '../schemas/OffenseCharts';
import { PlaceKickTableSchema, PlaceKickTableNormalizedSchema } from '../schemas/PlaceKicking';
import { TimeKeepingSchema, TimeKeepingFlatSchema } from '../schemas/Timekeeping';
import {} from './Result';
// Long Gain schema (inline) based on data/long_gain.json
const LongGainEntrySchema = z.object({
    baseYards: z.number(),
    extra: z
        .object({
        die: z.literal('1d6'),
        multiplier: z.number(),
    })
        .optional(),
});
const LongGainSchema = z.object({
    results: z.record(z.string().regex(/^[1-6]$/), LongGainEntrySchema),
});
// Normalize helpers
function toPlaceKickTable(json) {
    // Accept already-normalized tables
    const preParsed = PlaceKickTableSchema.safeParse(json);
    if (preParsed.success) {
        const data = preParsed.data;
        if (data && typeof data === 'object' && !('results' in data)) {
            const normalized = PlaceKickTableNormalizedSchema.safeParse(data);
            if (normalized.success)
                return normalized.data;
        }
        // Transform from rich schema shape
        try {
            const colKeys = Array.isArray(data?.columns)
                ? data.columns.map((c) => c?.range).filter((k) => typeof k === 'string')
                : [];
            const rows = Array.isArray(data?.results) ? data.results : [];
            const table = {};
            for (const r of rows) {
                const roll = String(r.roll);
                if (!/^(?:[1-9]|1[0-2])$/.test(roll))
                    continue;
                const row = {};
                for (const key of colKeys) {
                    const v = r[key];
                    if (v === 'G' || v === 'NG')
                        row[key] = v;
                }
                table[roll] = row;
            }
            const parsed = PlaceKickTableNormalizedSchema.safeParse(table);
            return parsed.success ? parsed.data : undefined;
        }
        catch {
            return undefined;
        }
    }
    // Attempt to transform from data/place_kicking.json shape
    try {
        const colKeys = Array.isArray(json?.columns)
            ? json.columns.map((c) => c?.range).filter((k) => typeof k === 'string')
            : [];
        const rows = Array.isArray(json?.results) ? json.results : [];
        const table = {};
        for (const r of rows) {
            const roll = String(r.roll);
            if (!/^(?:[1-9]|1[0-2])$/.test(roll))
                continue;
            const row = {};
            for (const key of colKeys) {
                const v = r[key];
                if (v === 'G' || v === 'NG')
                    row[key] = v;
            }
            table[roll] = row;
        }
        const parsed = PlaceKickTableNormalizedSchema.safeParse(table);
        return parsed.success ? parsed.data : undefined;
    }
    catch {
        return undefined;
    }
}
function toTimeKeeping(json) {
    const preParsed = TimeKeepingSchema.safeParse(json);
    if (preParsed.success) {
        const data = preParsed.data;
        if (data && typeof data === 'object' && !('rules' in data)) {
            const flat = TimeKeepingFlatSchema.safeParse(data);
            if (flat.success)
                return flat.data;
        }
        // Transform from rich schema
        try {
            const rules = Array.isArray(data?.rules) ? data.rules : [];
            const find = (event) => rules.find((r) => r?.event === event) || {};
            const abs = (n) => (typeof n === 'number' ? Math.abs(n) : 0);
            const tk = {
                gain0to20: Number(find('gain_in_bounds_0_to_20').duration) || 30,
                gain20plus: Number(find('gain_in_bounds_20_plus').duration) || 45,
                loss: Number(find('all_plays_for_loss').duration) || 30,
                outOfBounds: abs(find('out_of_bounds').adjustment) || 15,
                incomplete: abs(find('incomplete_pass').adjustment) || 15,
                interception: abs(find('interception').adjustment) || 30,
                penalty: abs(find('penalty').adjustment) || 15,
                fumble: abs(find('fumble').adjustment) || 15,
                kickoff: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
                fieldgoal: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
                punt: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
                extraPoint: abs(find('extra_point').adjustment) || 0,
            };
            const parsed = TimeKeepingFlatSchema.safeParse(tk);
            return parsed.success ? parsed.data : undefined;
        }
        catch {
            return undefined;
        }
    }
    try {
        const rules = Array.isArray(json?.rules) ? json.rules : [];
        const find = (event) => rules.find((r) => r?.event === event) || {};
        const abs = (n) => (typeof n === 'number' ? Math.abs(n) : 0);
        const tk = {
            gain0to20: Number(find('gain_in_bounds_0_to_20').duration) || 30,
            gain20plus: Number(find('gain_in_bounds_20_plus').duration) || 45,
            loss: Number(find('all_plays_for_loss').duration) || 30,
            outOfBounds: abs(find('out_of_bounds').adjustment) || 15,
            incomplete: abs(find('incomplete_pass').adjustment) || 15,
            interception: abs(find('interception').adjustment) || 30,
            penalty: abs(find('penalty').adjustment) || 15,
            fumble: abs(find('fumble').adjustment) || 15,
            kickoff: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
            fieldgoal: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
            punt: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
            extraPoint: abs(find('extra_point').adjustment) || 0,
        };
        const parsed = TimeKeepingFlatSchema.safeParse(tk);
        return parsed.success ? parsed.data : undefined;
    }
    catch {
        return undefined;
    }
}
function toLongGain(json) {
    const parsed = LongGainSchema.safeParse(json);
    if (parsed.success)
        return parsed.data.results;
    return undefined;
}
/** @deprecated prefer fetchOffenseCharts which returns Result */
export async function loadOffenseCharts() {
    const r = await fetchOffenseCharts();
    return r.ok ? r.data : undefined;
}
/** @deprecated prefer fetchPlaceKicking which returns Result */
export async function loadPlaceKicking() {
    const r = await fetchPlaceKicking();
    return r.ok ? r.data : undefined;
}
/** @deprecated prefer fetchTimeKeeping which returns Result */
export async function loadTimeKeeping() {
    const r = await fetchTimeKeeping();
    return r.ok ? r.data : undefined;
}
/** @deprecated prefer fetchLongGain which returns Result */
export async function loadLongGain() {
    const r = await fetchLongGain();
    return r.ok ? r.data : undefined;
}
// Result helpers and memoized fetchers
const tablesCache = new Map();
function ok(data) { return { ok: true, data }; }
function err(code, message) { return { ok: false, error: { code, message } }; }
export function clearTablesCache() {
    tablesCache.clear();
}
async function fetchJson(url) {
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
async function getOrFetch(key, loader) {
    if (tablesCache.has(key))
        return tablesCache.get(key);
    const res = await loader();
    tablesCache.set(key, res);
    return res;
}
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
// Deprecated helpers: forward for backward compatibility
/** @deprecated use fetchOffenseCharts */
export async function loadOffenseChartsDeprecated() {
    const r = await fetchOffenseCharts();
    return r.ok ? r.data : undefined;
}
/** @deprecated use fetchPlaceKicking */
export async function loadPlaceKickingDeprecated() {
    const r = await fetchPlaceKicking();
    return r.ok ? r.data : undefined;
}
/** @deprecated use fetchTimeKeeping */
export async function loadTimeKeepingDeprecated() {
    const r = await fetchTimeKeeping();
    return r.ok ? r.data : undefined;
}
/** @deprecated use fetchLongGain */
export async function loadLongGainDeprecated() {
    const r = await fetchLongGain();
    return r.ok ? r.data : undefined;
}
//# sourceMappingURL=tables.js.map