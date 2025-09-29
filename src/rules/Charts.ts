import type { RNG } from '../sim/RNG';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';
import { parseResultString } from './ResultParsing';
import { createLCG } from '../sim/RNG';
import { resolveLongGain as resolveLG } from './LongGain';

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
  const defLetter = DEF_NUM_TO_LETTER[defNum];
  const resultStr = charts?.[chartDeckKey]?.[chartPlayKey]?.[defLetter] ?? null;
  return parseResultString(resultStr, resolveLG, rng);
}


