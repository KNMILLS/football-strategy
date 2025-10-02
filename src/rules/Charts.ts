import type { RNG } from '../sim/RNG';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';
import { parseResultStringWithDice } from './ResultParsing';
import { resolveLongGain as resolveLG } from './LongGain';
import { globalTelemetryConfig } from '../telemetry/TelemetryConfig';
import { TelemetryCollector } from '../telemetry/TelemetryCollector';
import { EventBus } from '../utils/EventBus';

export const DEF_NUM_TO_LETTER: Record<number, 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'> = { 1:'A',2:'B',3:'C',4:'D',5:'E',6:'F',7:'G',8:'H',9:'I',0:'J' };

export const DEF_LABEL_TO_NUM: Record<string, number> = {
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

export const DECK_NAME_TO_CHART_KEY: Record<string, keyof OffenseCharts> = {
  'Pro Style': 'ProStyle',
  'Ball Control': 'BallControl',
  'Aerial Style': 'AerialStyle',
} as const;

export const LABEL_TO_CHART_KEY: Record<string, string> = {
  'Run & Pass Option': 'Run/Pass Option',
  'Sideline Pass': 'Side Line Pass',
};

// Global telemetry collector instance
let telemetryCollector: TelemetryCollector | null = null;

/**
 * Initialize telemetry collector with EventBus
 */
export function initializeTelemetry(eventBus: EventBus): void {
  if (globalTelemetryConfig.isEnabled()) {
    telemetryCollector = new TelemetryCollector(eventBus, globalTelemetryConfig);
  }
}

/**
 * Get current telemetry collector instance
 */
export function getTelemetryCollector(): TelemetryCollector | null {
  return telemetryCollector;
}

export interface DetermineOutcomeParams {
  deckName: string; // e.g. 'Pro Style'
  playLabel: string; // e.g. 'Power Up Middle'
  defenseLabel: string; // e.g. 'Inside Blitz'
  charts: OffenseCharts;
  rng: RNG;
}

export function determineOutcomeFromCharts(params: DetermineOutcomeParams) {
  const { deckName, playLabel, defenseLabel, charts, rng } = params;
  const chartDeckKey = (DECK_NAME_TO_CHART_KEY as any)[deckName] || (deckName as keyof OffenseCharts);
  const chartPlayKey = LABEL_TO_CHART_KEY[playLabel] || playLabel;
  const defNum = DEF_LABEL_TO_NUM[defenseLabel];
  const defLetter = (defNum != null ? DEF_NUM_TO_LETTER[defNum] : undefined) as 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|undefined;
  const deck = charts?.[chartDeckKey as keyof OffenseCharts] as any;
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


