import { z } from 'zod';
export async function loadJson(url, schema) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to load ${url}: ${res.status}`);
    const data = (await res.json());
    const parsed = schema.safeParse(data);
    if (!parsed.success)
        throw new Error(`Invalid JSON for ${url}: ${parsed.error.message}`);
    return parsed.data;
}
//# sourceMappingURL=JsonLoader.js.map