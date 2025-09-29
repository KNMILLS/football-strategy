import { z } from 'zod';
import { loadJson } from './JsonLoader';
import { OffenseChartsSchema, type OffenseCharts } from '../schemas/OffenseCharts';
import { PlaceKickTableSchema, PlaceKickTableNormalizedSchema, type PlaceKickTable } from '../schemas/PlaceKicking';
import { TimeKeepingSchema, TimeKeepingFlatSchema, type TimeKeeping } from '../schemas/Timekeeping';

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

export async function loadOffenseCharts(): Promise<OffenseCharts | undefined> {
  try {
    const data = await loadJson('data/football_strategy_all_mappings.json', OffenseChartsSchema);
    return data.OffenseCharts;
  } catch {
    return undefined;
  }
}

export async function loadPlaceKicking(): Promise<PlaceKickTable | undefined> {
  try {
    const res = await fetch('data/place_kicking.json');
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as unknown;
    return toPlaceKickTable(json);
  } catch {
    return undefined;
  }
}

export async function loadTimeKeeping(): Promise<TimeKeeping | undefined> {
  try {
    const res = await fetch('data/time_keeping.json');
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as unknown;
    return toTimeKeeping(json);
  } catch {
    return undefined;
  }
}

export async function loadLongGain(): Promise<LongGainTable | undefined> {
  try {
    const res = await fetch('data/long_gain.json');
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as unknown;
    return toLongGain(json);
  } catch {
    return undefined;
  }
}


