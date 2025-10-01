import type { OffenseCharts } from '../schemas/OffenseCharts';
import type { PlaceKickTable } from '../schemas/PlaceKicking';
import type { TimeKeeping } from '../schemas/Timekeeping';
import { fetchOffenseCharts } from './offenseCharts';
import { fetchPlaceKicking } from './placeKicking';
import { fetchTimeKeeping } from './timeKeeping';
import { fetchLongGain } from './longGain';
import type { LongGainTable } from '../normalizers/longGain';

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

// Deprecated helpers for older names retained in original file
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


