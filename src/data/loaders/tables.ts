// Data loaders barrel: single-responsibility modules live under loaders/ and normalizers/.
// Public API preserved for compatibility; no behavior changes.

export type { Result } from './Result';
export type { LongGainTable } from '../normalizers/longGain';
export type { OffenseCharts } from '../schemas/OffenseCharts';
export type { PlaceKickTable } from '../schemas/PlaceKicking';
export type { TimeKeeping } from '../schemas/Timekeeping';

export { fetchOffenseCharts } from './offenseCharts';
export { fetchPlaceKicking } from './placeKicking';
export { fetchTimeKeeping } from './timeKeeping';
export { fetchLongGain } from './longGain';

export { clearTablesCache } from './http';

// Deprecated shims (forwarders)
export {
  loadOffenseCharts,
  loadPlaceKicking,
  loadTimeKeeping,
  loadLongGain,
  loadOffenseChartsDeprecated,
  loadPlaceKickingDeprecated,
  loadTimeKeepingDeprecated,
  loadLongGainDeprecated,
} from './compat';


