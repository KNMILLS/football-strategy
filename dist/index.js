// Bootstrap: expose extracted modules for gradual integration
import * as Kickoff from './rules/special/Kickoff';
import * as Punt from './rules/special/Punt';
import * as PlaceKicking from './rules/special/PlaceKicking';
import * as ResultParsing from './rules/ResultParsing';
import * as Timekeeping from './rules/Timekeeping';
import * as Charts from './rules/Charts';
import * as RNG from './sim/RNG';
import * as PATDecision from './ai/PATDecision';
import * as CoachProfiles from './ai/CoachProfiles';
import { loadOffenseCharts, loadPlaceKicking, loadTimeKeeping, loadLongGain } from './data/loaders/tables';
import { EventBus } from './utils/EventBus';
import { registerHUD } from './ui/HUD';
import { registerLog } from './ui/Log';
import { registerField } from './ui/Field';
import { registerHand } from './ui/Hand';
export function boot() {
    // Placeholder bootstrap for future DOM wiring
}
if (typeof window !== 'undefined') {
    const bus = new EventBus();
    // Register UI subscribers
    registerHUD(bus);
    registerLog(bus);
    registerField(bus);
    registerHand(bus);
    const [offenseCharts, placeKicking, timeKeeping, longGain] = await Promise.all([
        loadOffenseCharts(),
        loadPlaceKicking(),
        loadTimeKeeping(),
        loadLongGain(),
    ]);
    window.GS = {
        rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain: (await import('./rules/LongGain')) },
        ai: { PATDecision, CoachProfiles },
        sim: { RNG },
        tables: { offenseCharts, placeKicking, timeKeeping, longGain },
        bus,
    };
}
// Load legacy DOM/UI logic via bridge (replaces <script src="main.js">)
await import('./legacy/main-bridge');
//# sourceMappingURL=index.js.map