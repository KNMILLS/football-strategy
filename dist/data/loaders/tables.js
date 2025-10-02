// Data loaders barrel: single-responsibility modules live under loaders/ and normalizers/.
// Public API preserved for compatibility; no behavior changes.
export { fetchOffenseCharts } from './offenseCharts';
export { fetchPlaceKicking } from './placeKicking';
export { fetchTimeKeeping } from './timeKeeping';
export { fetchLongGain } from './longGain';
export { fetchMatchupTable, fetchMatchupTableByCards } from './matchupTables';
export { fetchPenaltyTable, fetchPenaltyTableByName } from './penaltyTables';
export { clearTablesCache } from './http';
// Deprecated shims (forwarders)
export { loadOffenseCharts, loadPlaceKicking, loadTimeKeeping, loadLongGain, loadOffenseChartsDeprecated, loadPlaceKickingDeprecated, loadTimeKeepingDeprecated, loadLongGainDeprecated, } from './compat';
//# sourceMappingURL=tables.js.map