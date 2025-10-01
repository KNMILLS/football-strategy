import { simulateOneGame } from './single';

export async function simulateAutoGames(opts: { seeds: number[]; playerPAT: 'kick'|'two'|'auto' }): Promise<Array<{ seed: number; result: { home: number; away: number; winner: string } }>> {
  const out: Array<{ seed: number; result: { home: number; away: number; winner: string } }> = [];
  for (const seed of opts.seeds) {
    const res = await simulateOneGame({ seed, playerPAT: opts.playerPAT });
    out.push({ seed, result: { home: res.home, away: res.away, winner: res.winner } });
  }
  return out;
}
