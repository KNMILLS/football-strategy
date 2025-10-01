import { fetchOffenseCharts } from './offenseCharts';
import { fetchPlaceKicking } from './placeKicking';
import { fetchTimeKeeping } from './timeKeeping';
import { fetchLongGain } from './longGain';
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
// Deprecated helpers for older names retained in original file
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
//# sourceMappingURL=compat.js.map