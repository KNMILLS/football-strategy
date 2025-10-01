import type { Result, Ok, Err } from './Result';

// Shared cache for data table fetchers
export const tablesCache = new Map<string, Result<any>>();

export function ok<T>(data: T): Ok<T> { return { ok: true, data }; }
export function err(code: string, message: string): Err { return { ok: false, error: { code, message } }; }

export function clearTablesCache(): void {
  tablesCache.clear();
}

export async function fetchJson<T>(url: string): Promise<Result<T>> {
  try {
    const res = await fetch(url);
    if (!res.ok) return err('HTTP', `status ${res.status} for ${url}`);
    const json = (await res.json()) as unknown as T;
    return ok(json);
  } catch (e: any) {
    return err('HTTP', `failed to fetch ${url}: ${e?.message ?? String(e)}`);
  }
}

export async function getOrFetch<T>(key: string, loader: () => Promise<Result<T>>): Promise<Result<T>> {
  if (tablesCache.has(key)) return tablesCache.get(key) as Result<T>;
  const res = await loader();
  tablesCache.set(key, res as Result<any>);
  return res;
}


