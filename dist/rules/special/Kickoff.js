import { rollD6, resolveLongGain } from '../LongGain';
export const NORMAL_KICKOFF_TABLE = {
    2: 'FUMBLE*',
    3: 'PENALTY -10*',
    4: 10,
    5: 15,
    6: 20,
    7: 25,
    8: 30,
    9: 35,
    10: 40,
    11: 'LG',
    12: 'LG + 5',
};
export const ONSIDE_KICK_TABLE = {
    1: { possession: 'kicker', yard: 40 },
    2: { possession: 'kicker', yard: 40 },
    3: { possession: 'receiver', yard: 35 },
    4: { possession: 'receiver', yard: 35 },
    5: { possession: 'receiver', yard: 35 },
    6: { possession: 'receiver', yard: 30 },
};
export function parseKickoffYardLine(res, rng) {
    if (typeof res === 'number')
        return { yardLine: res, turnover: false };
    if (res === 'LG')
        return { yardLine: Math.min(resolveLongGain(rng), 50), turnover: false };
    if (res === 'LG + 5')
        return { yardLine: Math.min(resolveLongGain(rng) + 5, 50), turnover: false };
    return { yardLine: 25, turnover: false };
}
export function resolveKickoff(rng, opts) {
    if (opts.onside) {
        let roll = rollD6(rng);
        if (opts.kickerLeadingOrTied)
            roll = Math.min(6, roll + 1);
        const entry = ONSIDE_KICK_TABLE[roll] || { possession: 'receiver', yard: 35 };
        return { yardLine: entry.yard, turnover: entry.possession === 'kicker' };
    }
    let roll = rollD6(rng) + rollD6(rng);
    let entry = NORMAL_KICKOFF_TABLE[roll];
    let turnover = false;
    let penalty = false;
    if (typeof entry === 'string' && entry.includes('*')) {
        if (/FUMBLE/i.test(entry))
            turnover = true;
        if (/PENALTY/i.test(entry))
            penalty = true;
        // strip '*'
        entry = entry.replace('*', '').trim();
        // reroll for yard line possibly with another star
        const reroll = rollD6(rng) + rollD6(rng);
        let res2 = NORMAL_KICKOFF_TABLE[reroll];
        if (typeof res2 === 'string' && res2.includes('*')) {
            if (/FUMBLE/i.test(res2))
                turnover = false; // offset
            if (/PENALTY/i.test(res2))
                penalty = false; // offset
            res2 = res2.replace('*', '').trim();
        }
        entry = res2;
    }
    const parsed = parseKickoffYardLine(entry, rng);
    let finalYard = parsed.yardLine;
    if (penalty)
        finalYard = Math.max(0, parsed.yardLine - 10);
    return { yardLine: finalYard, turnover };
}
//# sourceMappingURL=Kickoff.js.map