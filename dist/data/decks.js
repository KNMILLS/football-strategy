const LABEL_TO_CHART_KEY_LOCAL = {
    'Sideline Pass': 'Side Line Pass',
    'Run & Pass Option': 'Run/Pass Option',
};
const OFFENSE_BASE_LABELS = [
    'Power Up Middle',
    'Power Off Tackle',
    'QB Keeper',
    'Slant Run',
    'End Run',
    'Reverse',
    'Draw',
    'Trap',
    'Run & Pass Option',
    'Flair Pass',
    'Sideline Pass',
    'Look In Pass',
    'Screen Pass',
    'Pop Pass',
    'Button Hook Pass',
    'Razzle Dazzle',
    'Down & Out Pass',
    'Down & In Pass',
    'Long Bomb',
    'Stop & Go Pass',
];
function makeCardId(deck, label) {
    const deckKey = deck.replace(/\s+/g, '_');
    const labelKey = label
        .replace(/\s+/g, '')
        .replace(/[()&]/g, '')
        .replace(/\/+/, '');
    return `${deckKey}_${labelKey}`;
}
function makeArtPath(deck, label) {
    return `assets/cards/${deck}/${label}.jpg`;
}
function inferTypeFromLabel(label) {
    if (label.startsWith('Punt'))
        return 'punt';
    const lowered = label.toLowerCase();
    if (lowered.includes('pass'))
        return 'pass';
    if (['Run & Pass Option'].includes(label))
        return 'run';
    return 'run';
}
function buildOffenseDeck(deck) {
    // Base 20 offense plays
    const base = OFFENSE_BASE_LABELS.map((label) => ({
        id: makeCardId(deck, label),
        deck,
        label,
        type: inferTypeFromLabel(label),
        art: makeArtPath(deck, label),
    }));
    // Include one 4th-down-only punt card per deck
    const puntLabel = 'Punt (4th Down Only)';
    const punt = {
        id: makeCardId(deck, puntLabel),
        deck,
        label: puntLabel,
        type: 'punt',
        art: makeArtPath(deck, puntLabel),
    };
    // Exclude Field Goal from deck (handled by controls elsewhere)
    // Ensure final count is exactly 20 by removing one duplicate-type label if needed
    // The base list already has 20. Replace one low-importance card with Punt to keep 20.
    const filtered = base.filter((c) => c.label !== 'Trap');
    return [...filtered, punt];
}
export const OFFENSE_DECKS = {
    'Pro Style': buildOffenseDeck('Pro Style'),
    'Ball Control': buildOffenseDeck('Ball Control'),
    'Aerial Style': buildOffenseDeck('Aerial Style'),
};
export const DEFENSE_DECK = [
    { id: 'Defense_GoalLine', label: 'Goal Line' },
    { id: 'Defense_ShortYardage', label: 'Short Yardage' },
    { id: 'Defense_InsideBlitz', label: 'Inside Blitz' },
    { id: 'Defense_Running', label: 'Running' },
    { id: 'Defense_RunAndPass', label: 'Run & Pass' },
    { id: 'Defense_PassAndRun', label: 'Pass & Run' },
    { id: 'Defense_Passing', label: 'Passing' },
    { id: 'Defense_OutsideBlitz', label: 'Outside Blitz' },
    { id: 'Defense_Prevent', label: 'Prevent' },
    { id: 'Defense_PreventDeep', label: 'Prevent Deep' },
];
// White-sign (goal-line) restrictions; populate known restricted plays
// Keyed by play label, value is max distance (yards to opponent goal) where play is restricted
export const WHITE_SIGN_RESTRICTIONS = {
    // Example restrictions; tune when canonical list available
    'Long Bomb': 5,
    'Run & Pass Option': 2,
    'Razzle Dazzle': 5,
    'Stop & Go Pass': 5,
};
// Utility for tests: ensure labels align via LABEL_TO_CHART_KEY elsewhere
export const __LABEL_MAP = LABEL_TO_CHART_KEY_LOCAL;
//# sourceMappingURL=decks.js.map