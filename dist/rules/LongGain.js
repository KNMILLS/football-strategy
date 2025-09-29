export const LONG_GAIN_TABLE = {
    1: '+50 and (+10 x 1D6)',
    2: '+50',
    3: '+45',
    4: '+40',
    5: '+35',
    6: '+30',
};
export function rollD6(rng) {
    return Math.floor(rng() * 6) + 1;
}
export function resolveLongGain(rng) {
    const roll = rollD6(rng);
    const entry = LONG_GAIN_TABLE[roll];
    if (!entry)
        return 30;
    if (entry.includes('and')) {
        // "+50 and (+10 x 1D6)"
        const extra = rollD6(rng) * 10;
        return 50 + extra;
    }
    const m = entry.match(/\+(\d+)/);
    return m && m[1] ? parseInt(m[1], 10) : 30;
}
//# sourceMappingURL=LongGain.js.map