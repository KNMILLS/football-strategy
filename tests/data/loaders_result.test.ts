import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

import {
  fetchOffenseCharts,
  fetchPlaceKicking,
  fetchTimeKeeping,
  fetchLongGain,
  clearTablesCache,
} from '../../src/data/loaders/tables';

import { OffenseChartsSchema } from '../../src/data/schemas/OffenseCharts';
import { PlaceKickTableSchema } from '../../src/data/schemas/PlaceKicking';
import { TimeKeepingSchema } from '../../src/data/schemas/Timekeeping';

const makeResponse = (ok: boolean, jsonData: unknown, status = 200) => ({
  ok,
  status,
  json: async () => jsonData,
}) as any as Response;

describe('tables fetch* loaders return Result and are memoized', () => {
  const g: any = globalThis as any;
  const origFetch = g.fetch;

  beforeEach(() => {
    clearTablesCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    g.fetch = origFetch;
  });

  it('OffenseCharts success', async () => {
    const valid = { OffenseCharts: { ProStyle: {}, BallControl: {}, AerialStyle: {} } };
    g.fetch = vi.fn().mockResolvedValue(makeResponse(true, valid));
    const res = await fetchOffenseCharts();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(OffenseChartsSchema.safeParse({ OffenseCharts: res.data }).success).toBe(true);
    }
  });

  it('OffenseCharts schema error', async () => {
    const invalid = { Foo: {} };
    g.fetch = vi.fn().mockResolvedValue(makeResponse(true, invalid));
    const res = await fetchOffenseCharts();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('SCHEMA');
  });

  it('OffenseCharts network error', async () => {
    g.fetch = vi.fn().mockResolvedValue(makeResponse(false, {}, 404));
    const res = await fetchOffenseCharts();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('HTTP');
  });

  it('PlaceKicking success and memoization', async () => {
    const rich = {
      name: 'Place Kicking',
      dice: '2d6',
      columns: [{ range: 'PAT' }],
      results: [{ roll: 2, PAT: 'NG' }],
    };
    g.fetch = vi.fn().mockResolvedValue(makeResponse(true, rich));
    const r1 = await fetchPlaceKicking();
    const r2 = await fetchPlaceKicking();
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(g.fetch).toHaveBeenCalledTimes(1);
    if (r1.ok) expect(PlaceKickTableSchema.safeParse(r1.data).success).toBe(true);
  });

  it('PlaceKicking schema error', async () => {
    const malformed = { foo: 'bar' };
    g.fetch = vi.fn().mockResolvedValue(makeResponse(true, malformed));
    const res = await fetchPlaceKicking();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('SCHEMA');
  });

  it('TimeKeeping transform error', async () => {
    // Valid union but fails our normalization (missing rules entries)
    const rich = { name: 'Time', units: 'seconds', rules: [{ event: 'unknown' }] };
    g.fetch = vi.fn().mockResolvedValue(makeResponse(true, rich));
    const res = await fetchTimeKeeping();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code === 'SCHEMA' || res.error.code === 'TRANSFORM').toBe(true);
  });

  it('LongGain network error', async () => {
    g.fetch = vi.fn().mockResolvedValue(makeResponse(false, {}, 500));
    const res = await fetchLongGain();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('HTTP');
  });
});


