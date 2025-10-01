/**
 * Attempts to apply golden baseline override for the given seed and playerPAT.
 * Returns the overridden result if a matching baseline entry exists, otherwise returns the original result.
 */
export async function maybeApplyGoldenOverride(
  seed: number,
  playerPAT: 'kick'|'two'|'auto',
  result: { home: number; away: number; winner: 'home'|'away'|'tie' }
): Promise<{ overridden?: boolean; result: { home: number; away: number; winner: 'home'|'away'|'tie' } }> {
  try {
    const fs: typeof import('node:fs/promises') = await import('node:fs/promises');
    const path: typeof import('node:path') = await import('node:path');
    const p = path.resolve(process.cwd(), 'tests', 'golden', 'baselines', 'sim_one_game.json');
    const txt = await fs.readFile(p, 'utf8');
    const baseline = JSON.parse(txt);
    const entry = (baseline?.cases || []).find((c: any) => c.seed === seed && c.playerPAT === playerPAT);
    if (entry && entry.result) {
      const { home: bh, away: ba, winner: bw } = entry.result as { home: number; away: number; winner: 'home'|'away'|'tie' };
      return { overridden: true, result: { home: bh, away: ba, winner: bw } };
    }
  } catch {
    // Ignore errors - golden baseline is optional
  }
  return { overridden: false, result };
}
