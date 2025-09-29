import { parseResultString } from './ResultParsing';
import { resolveLongGain as resolveLG } from './LongGain';
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
export function determineOutcomeFromCharts(params) {
    const { deckName, playLabel, defenseLabel, charts, rng } = params;
    const chartDeckKey = DECK_NAME_TO_CHART_KEY[deckName] || deckName;
    const chartPlayKey = LABEL_TO_CHART_KEY[playLabel] || playLabel;
    const defNum = DEF_LABEL_TO_NUM[defenseLabel];
    const defLetter = (defNum != null ? DEF_NUM_TO_LETTER[defNum] : undefined);
    const deck = charts?.[chartDeckKey];
    const play = deck ? deck[chartPlayKey] : undefined;
    const resultStr = defLetter && play ? play[defLetter] : null;
    return parseResultString(resultStr, resolveLG, rng);
}
//# sourceMappingURL=Charts.js.map