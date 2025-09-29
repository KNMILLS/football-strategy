export const DEFAULT_TIME_KEEPING = {
    gain0to20: 30,
    gain20plus: 45,
    loss: 30,
    outOfBounds: 15,
    incomplete: 15,
    interception: 30,
    penalty: 15,
    fumble: 15,
    kickoff: 15,
    fieldgoal: 15,
    punt: 15,
    extraPoint: 0,
};
export function parseResultString(str, resolveLongGain, rng) {
    const outcome = { yards: 0, penalty: null, turnover: false, interceptReturn: 0, firstDown: false };
    if (!str)
        return outcome;
    const s = str.trim();
    outcome.raw = s;
    outcome.outOfBounds = /O\/?B/i.test(s);
    if (/Incomplete/i.test(s)) {
        outcome.category = 'incomplete';
        return outcome;
    }
    if (/FUMBLE/i.test(s)) {
        outcome.turnover = true;
        outcome.category = 'fumble';
        return outcome;
    }
    if (/INTERCEPT/i.test(s)) {
        outcome.turnover = true;
        outcome.category = 'interception';
        const m = s.match(/[+-]?\d+/);
        if (m)
            outcome.interceptReturn = parseInt(m[0], 10);
        return outcome;
    }
    if (/PENALTY/i.test(s)) {
        const m = s.match(/[+-]\d+/);
        const yards = m ? parseInt(m[0], 10) : 0;
        const onDefense = yards > 0;
        outcome.penalty = { on: onDefense ? 'defense' : 'offense', yards: Math.abs(yards), firstDown: /1st\s*Down/i.test(s) };
        outcome.category = 'penalty';
        return outcome;
    }
    if (/Sack/i.test(s)) {
        const m = s.match(/-\d+/);
        if (m)
            outcome.yards = parseInt(m[0], 10);
        outcome.category = 'loss';
        return outcome;
    }
    if (/LG/.test(s)) {
        outcome.yards = resolveLongGain(rng);
        outcome.category = 'gain';
        return outcome;
    }
    const numMatch = s.match(/[+-]?\d+/);
    if (numMatch) {
        outcome.yards = parseInt(numMatch[0], 10);
        outcome.category = outcome.yards < 0 ? 'loss' : 'gain';
        return outcome;
    }
    const completeMatch = s.match(/Complete\s*[+-]\d+/i);
    if (completeMatch) {
        const m2 = completeMatch[0].match(/[+-]\d+/);
        if (m2)
            outcome.yards = parseInt(m2[0], 10);
        outcome.category = outcome.yards < 0 ? 'loss' : 'gain';
        return outcome;
    }
    outcome.category = 'other';
    return outcome;
}
export function calculateTimeOff(outcome, TIME_KEEPING = DEFAULT_TIME_KEEPING) {
    if (!outcome)
        return TIME_KEEPING.gain0to20;
    if (outcome.outOfBounds)
        return TIME_KEEPING.outOfBounds;
    switch (outcome.category) {
        case 'incomplete': return TIME_KEEPING.incomplete;
        case 'interception': return TIME_KEEPING.interception;
        case 'fumble': return TIME_KEEPING.fumble;
        case 'penalty': return TIME_KEEPING.penalty;
        case 'loss': return TIME_KEEPING.loss;
        case 'gain': return Math.abs(outcome.yards) > 20 ? TIME_KEEPING.gain20plus : TIME_KEEPING.gain0to20;
        default: return TIME_KEEPING.gain0to20;
    }
}
//# sourceMappingURL=ResultParsing.js.map