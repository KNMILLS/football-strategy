import { simulateOneGame } from './single';
export async function simulateAutoGames(opts) {
    const out = [];
    for (const seed of opts.seeds) {
        const res = await simulateOneGame({ seed, playerPAT: opts.playerPAT });
        out.push({ seed, result: { home: res.home, away: res.away, winner: res.winner } });
    }
    return out;
}
//# sourceMappingURL=batch.js.map