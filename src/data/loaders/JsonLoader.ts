import { z } from 'zod';

export async function loadJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const data = (await res.json()) as unknown;
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(`Invalid JSON for ${url}: ${parsed.error.message}`);
  return parsed.data;
}


