export const PLACE_KICK_TABLE = {
    2: { PAT: 'NG', '1-12': 'NG', '13-22': 'NG', '23-32': 'G', '33-38': 'G', '39-45': 'G' },
    3: { PAT: 'G', '1-12': 'NG', '13-22': 'NG', '23-32': 'NG', '33-38': 'G', '39-45': 'NG' },
    4: { PAT: 'G', '1-12': 'G', '13-22': 'NG', '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
    5: { PAT: 'G', '1-12': 'G', '13-22': 'G', '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
    6: { PAT: 'G', '1-12': 'G', '13-22': 'G', '23-32': 'G', '33-38': 'NG', '39-45': 'NG' },
    7: { PAT: 'G', '1-12': 'G', '13-22': 'G', '23-32': 'G', '33-38': 'G', '39-45': 'NG' },
    8: { PAT: 'G', '1-12': 'G', '13-22': 'G', '23-32': 'G', '33-38': 'NG', '39-45': 'NG' },
    9: { PAT: 'G', '1-12': 'G', '13-22': 'G', '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
    10: { PAT: 'G', '1-12': 'G', '13-22': 'G', '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
    11: { PAT: 'G', '1-12': 'G', '13-22': 'NG', '23-32': 'NG', '33-38': 'G', '39-45': 'NG' },
    12: { PAT: 'NG', '1-12': 'NG', '13-22': 'G', '23-32': 'G', '33-38': 'G', '39-45': 'G' },
};
export function rollD6(rng) { return Math.floor(rng() * 6) + 1; }
export function attemptPAT(rng) {
    const roll = rollD6(rng) + rollD6(rng);
    const row = PLACE_KICK_TABLE[roll] || {};
    return row.PAT === 'G';
}
export function attemptFieldGoal(rng, attemptYards) {
    const ay = Math.round(attemptYards);
    let col = null;
    if (ay <= 12)
        col = '1-12';
    else if (ay <= 22)
        col = '13-22';
    else if (ay <= 32)
        col = '23-32';
    else if (ay <= 38)
        col = '33-38';
    else if (ay <= 45)
        col = '39-45';
    else
        col = null;
    if (!col)
        return false;
    const roll = rollD6(rng) + rollD6(rng);
    const row = PLACE_KICK_TABLE[roll] || {};
    return row[col] === 'G';
}
//# sourceMappingURL=PlaceKicking.js.map