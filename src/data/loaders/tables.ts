import { z } from 'zod';
import { loadJson } from './JsonLoader';
import { OffenseChartsSchema, type OffenseCharts } from '../schemas/OffenseCharts';
import { PlaceKickTableSchema, PlaceKickTableNormalizedSchema, type PlaceKickTable } from '../schemas/PlaceKicking';
import { TimeKeepingSchema, TimeKeepingFlatSchema, type TimeKeeping } from '../schemas/Timekeeping';
import type { Result } from './Result';
import { type Ok, type Err } from './Result';

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

export type LongGainTable = z.infer<typeof LongGainSchema>['results'];

// Normalize helpers
function toPlaceKickTable(json: any): ReturnType<typeof PlaceKickTableNormalizedSchema.parse> | undefined {
  // Accept already-normalized tables
  const preParsed = PlaceKickTableSchema.safeParse(json);
  if (preParsed.success) {
    const data: any = preParsed.data as any;
    if (data && typeof data === 'object' && !('results' in data)) {
      const normalized = PlaceKickTableNormalizedSchema.safeParse(data);
      if (normalized.success) return normalized.data;
    }
    // Transform from rich schema shape
    try {
      const colKeys: string[] = Array.isArray((data as any)?.columns)
        ? (data as any).columns.map((c: any) => c?.range).filter((k: any) => typeof k === 'string')
        : [];
      const rows: any[] = Array.isArray((data as any)?.results) ? (data as any).results : [];
      const table: Record<string, Record<string, 'G' | 'NG'>> = {};
      for (const r of rows) {
        const roll = String(r.roll);
        if (!/^(?:[1-9]|1[0-2])$/.test(roll)) continue;
        const row: Record<string, 'G' | 'NG'> = {} as any;
        for (const key of colKeys) {
          const v = r[key];
          if (v === 'G' || v === 'NG') row[key] = v;
        }
        table[roll] = row;
      }
      const parsed = PlaceKickTableNormalizedSchema.safeParse(table);
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }
  // Attempt to transform from data/place_kicking.json shape
  try {
    const colKeys: string[] = Array.isArray(json?.columns)
      ? json.columns.map((c: any) => c?.range).filter((k: any) => typeof k === 'string')
      : [];
    const rows: any[] = Array.isArray(json?.results) ? json.results : [];
    const table: Record<string, Record<string, 'G' | 'NG'>> = {};
    for (const r of rows) {
      const roll = String(r.roll);
      if (!/^(?:[1-9]|1[0-2])$/.test(roll)) continue;
      const row: Record<string, 'G' | 'NG'> = {} as any;
      for (const key of colKeys) {
        const v = r[key];
        if (v === 'G' || v === 'NG') row[key] = v;
      }
      table[roll] = row;
    }
    const parsed = PlaceKickTableNormalizedSchema.safeParse(table);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function toTimeKeeping(json: any): TimeKeeping | undefined {
  const preParsed = TimeKeepingSchema.safeParse(json);
  if (preParsed.success) {
    const data: any = preParsed.data as any;
    if (data && typeof data === 'object' && !('rules' in data)) {
      const flat = TimeKeepingFlatSchema.safeParse(data);
      if (flat.success) return flat.data;
    }
    // Transform from rich schema
    try {
      const rules: any[] = Array.isArray(data?.rules) ? data.rules : [];
      const find = (event: string) => rules.find((r) => r?.event === event) || {};
      const abs = (n: any) => (typeof n === 'number' ? Math.abs(n) : 0);
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
    } catch {
      return undefined;
    }
  }
  try {
    const rules: any[] = Array.isArray(json?.rules) ? json.rules : [];
    const find = (event: string) => rules.find((r) => r?.event === event) || {};
    const abs = (n: any) => (typeof n === 'number' ? Math.abs(n) : 0);
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
  } catch {
    return undefined;
  }
}

function toLongGain(json: any): LongGainTable | undefined {
  const parsed = LongGainSchema.safeParse(json);
  if (parsed.success) return parsed.data.results;
  return undefined;
}

/** @deprecated prefer fetchOffenseCharts which returns Result */
export async function loadOffenseCharts(): Promise<OffenseCharts | undefined> {
  const r = await fetchOffenseCharts();
  return r.ok ? r.data : undefined;
}

/** @deprecated prefer fetchPlaceKicking which returns Result */
export async function loadPlaceKicking(): Promise<PlaceKickTable | undefined> {
  const r = await fetchPlaceKicking();
  return r.ok ? r.data : undefined;
}

/** @deprecated prefer fetchTimeKeeping which returns Result */
export async function loadTimeKeeping(): Promise<TimeKeeping | undefined> {
  const r = await fetchTimeKeeping();
  return r.ok ? r.data : undefined;
}

/** @deprecated prefer fetchLongGain which returns Result */
export async function loadLongGain(): Promise<LongGainTable | undefined> {
  const r = await fetchLongGain();
  return r.ok ? r.data : undefined;
}

// Result helpers and memoized fetchers
const tablesCache = new Map<string, Result<any>>();

function ok<T>(data: T): Ok<T> { return { ok: true, data }; }
function err(code: string, message: string): Err { return { ok: false, error: { code, message } }; }

export function clearTablesCache(): void {
  tablesCache.clear();
}

async function fetchJson<T>(url: string): Promise<Result<T>> {
  try {
    const res = await fetch(url);
    if (!res.ok) return err('HTTP', `status ${res.status} for ${url}`);
    const json = (await res.json()) as unknown as T;
    return ok(json);
  } catch (e: any) {
    return err('HTTP', `failed to fetch ${url}: ${e?.message ?? String(e)}`);
  }
}

async function getOrFetch<T>(key: string, loader: () => Promise<Result<T>>): Promise<Result<T>> {
  if (tablesCache.has(key)) return tablesCache.get(key) as Result<T>;
  const res = await loader();
  tablesCache.set(key, res as Result<any>);
  return res;
}

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

export async function fetchPlaceKicking(): Promise<Result<PlaceKickTable>> {
  const key = 'data/place_kicking.json';
  return getOrFetch(key, async () => {
    const jsonRes = await fetchJson<unknown>(key);
    if (!jsonRes.ok) return jsonRes as Err;
    // Accept rich or normalized, transform to normalized if needed
    const normalized = toPlaceKickTable(jsonRes.data);
    if (!normalized) {
      // Try to indicate if schema vs transform: first check union schema
      const union = PlaceKickTableSchema.safeParse(jsonRes.data);
      if (!union.success) return err('SCHEMA', union.error.message);
      return err('TRANSFORM', 'failed to normalize place-kicking table');
    }
    return ok(normalized);
  });
}

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

// Deprecated helpers: forward for backward compatibility
/** @deprecated use fetchOffenseCharts */
export async function loadOffenseChartsDeprecated(): Promise<OffenseCharts | undefined> {
  const r = await fetchOffenseCharts();
  return r.ok ? r.data : undefined;
}
/** @deprecated use fetchPlaceKicking */
export async function loadPlaceKickingDeprecated(): Promise<PlaceKickTable | undefined> {
  const r = await fetchPlaceKicking();
  return r.ok ? r.data : undefined;
}
/** @deprecated use fetchTimeKeeping */
export async function loadTimeKeepingDeprecated(): Promise<TimeKeeping | undefined> {
  const r = await fetchTimeKeeping();
  return r.ok ? r.data : undefined;
}
/** @deprecated use fetchLongGain */
export async function loadLongGainDeprecated(): Promise<LongGainTable | undefined> {
  const r = await fetchLongGain();
  return r.ok ? r.data : undefined;
}

