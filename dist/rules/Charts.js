import { parseResultStringWithDice } from './ResultParsing';
import { resolveLongGain as resolveLG } from './LongGain';
import { globalTelemetryConfig } from '../telemetry/TelemetryConfig';
import { TelemetryCollector } from '../telemetry/TelemetryCollector';
import { EventBus } from '../utils/EventBus';
export const DEF_NUM_TO_LETTER = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 0: 'J' };
export const DEF_LABEL_TO_NUM = {
    'Goal Line': 1,
    'Short Yardage': 2,
    'Inside Blitz': 3,
    'Running': 4,
    'Run & Pass': 5,
    'Pass & Run': 6,
    'Passing': 7,
    'Outside Blitz': 8,
    'Prevent': 9,
    'Prevent Deep': 0,
};
export const DECK_NAME_TO_CHART_KEY = {
    'Pro Style': 'ProStyle',
    'Ball Control': 'BallControl',
    'Aerial Style': 'AerialStyle',
};
export const LABEL_TO_CHART_KEY = {
    'Run & Pass Option': 'Run/Pass Option',
    'Sideline Pass': 'Side Line Pass',
};
// Global telemetry collector instance
let telemetryCollector = null;
/**
 * Initialize telemetry collector with EventBus
 */
export function initializeTelemetry(eventBus) {
    if (globalTelemetryConfig.isEnabled()) {
        telemetryCollector = new TelemetryCollector(eventBus, globalTelemetryConfig);
    }
}
/**
 * Get current telemetry collector instance
 */
export function getTelemetryCollector() {
    return telemetryCollector;
}
export function determineOutcomeFromCharts(params) {
    const { deckName, playLabel, defenseLabel, charts, rng } = params;
    const chartDeckKey = DECK_NAME_TO_CHART_KEY[deckName] || deckName;
    const chartPlayKey = LABEL_TO_CHART_KEY[playLabel] || playLabel;
    const defNum = DEF_LABEL_TO_NUM[defenseLabel];
    const defLetter = (defNum != null ? DEF_NUM_TO_LETTER[defNum] : undefined);
    const deck = charts?.[chartDeckKey];
    const play = deck ? deck[chartPlayKey] : undefined;
    const resultStr = defLetter && play ? play[defLetter] : null;
    // Record dice roll if telemetry is enabled
    if (telemetryCollector && resultStr) {
        // Use the new parseResultStringWithDice to capture dice information
        const parseResult = parseResultStringWithDice(resultStr, resolveLG, rng);
        // Record dice roll if there were any dice rolled
        if (parseResult.diceRolls && parseResult.diceRolls.length > 0) {
            // Convert dice rolls to the expected format (d1, d2, sum, isDoubles)
            const diceRolls = parseResult.diceRolls;
            const d1 = diceRolls[0] || 0;
            const d2 = diceRolls[1] || d1; // Handle single die rolls
            const sum = diceRolls.reduce((acc, roll) => acc + roll, 0);
            const isDoubles = d1 === d2 && diceRolls.length > 1;
            telemetryCollector.recordDiceRoll({
                playLabel,
                defenseLabel,
                deckName,
                diceResult: { d1, d2, sum, isDoubles },
                chartKey: String(chartDeckKey),
                ...(defLetter ? { defenseKey: defLetter } : {})
            });
        }
        // Record outcome determination
        telemetryCollector.recordOutcomeDetermined({
            playLabel,
            defenseLabel,
            deckName,
            outcome: {
                category: parseResult.outcome.category || 'other',
                yards: parseResult.outcome.yards,
                penalty: parseResult.outcome.penalty || undefined,
                interceptReturn: parseResult.outcome.interceptReturn,
                resultString: resultStr || undefined
            }
        });
        return parseResult.outcome;
    }
    return parseResultStringWithDice(resultStr, resolveLG, rng).outcome;
}
//# sourceMappingURL=Charts.js.map