import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PlaceKickTableSchema } from '../../src/data/schemas/PlaceKicking';
import { TimeKeepingSchema } from '../../src/data/schemas/Timekeeping';

describe('other data schemas', () => {
  it('validates place_kicking.json', async () => {
    const p = path.resolve(process.cwd(), 'data', 'place_kicking.json');
    const raw = await readFile(p, 'utf8');
    const json = JSON.parse(raw);
    const res = PlaceKickTableSchema.safeParse(json);
    expect(res.success).toBe(true);
  });
  it('validates time_keeping.json', async () => {
    const p = path.resolve(process.cwd(), 'data', 'time_keeping.json');
    const raw = await readFile(p, 'utf8');
    const json = JSON.parse(raw);
    const res = TimeKeepingSchema.safeParse(json);
    expect(res.success).toBe(true);
  });
});


