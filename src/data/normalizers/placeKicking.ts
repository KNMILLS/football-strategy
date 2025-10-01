import { PlaceKickTableSchema, PlaceKickTableNormalizedSchema } from '../schemas/PlaceKicking';

export function toPlaceKickTable(json: any): ReturnType<typeof PlaceKickTableNormalizedSchema.parse> | undefined {
	// Accept already-normalized tables
	const preParsed = PlaceKickTableSchema.safeParse(json);
	if (preParsed.success) {
		const data: any = preParsed.data as any;
		if (data && typeof data === 'object' && !('results' in data)) {
			const normalized = PlaceKickTableNormalizedSchema.safeParse(data);
			if (normalized.success) {
				const keys = Object.keys(normalized.data || {});
				if (keys.length === 0) return undefined;
				const hasPAT = keys.some((k) => typeof (normalized.data as any)[k]?.PAT === 'string');
				if (!hasPAT) return undefined;
				return normalized.data;
			}
		}
		// Transform from rich schema shape
		try {
			const colKeys: string[] = Array.isArray((data as any)?.columns)
				? (data as any).columns.map((c: any) => c?.range).filter((k: any) => typeof k === 'string')
				: [];
			const rows: any[] = Array.isArray((data as any)?.results) ? (data as any).results : [];
			if (colKeys.length === 0 || rows.length === 0) return undefined;
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
			if (!parsed.success) return undefined;
			const keys = Object.keys(parsed.data || {});
			if (keys.length === 0) return undefined;
			const hasPAT = colKeys.includes('PAT') && keys.some((k) => typeof (parsed.data as any)[k]?.PAT === 'string');
			if (!hasPAT) return undefined;
			return parsed.data;
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
		if (colKeys.length === 0 || rows.length === 0) return undefined;
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
		if (!parsed.success) return undefined;
		const keys = Object.keys(parsed.data || {});
		if (keys.length === 0) return undefined;
		const hasPAT = colKeys.includes('PAT') && keys.some((k) => typeof (parsed.data as any)[k]?.PAT === 'string');
		if (!hasPAT) return undefined;
		return parsed.data;
	} catch {
		return undefined;
	}
}


