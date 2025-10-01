// Monte Carlo over coach matchups using compiled dist modules
// Usage: node scripts/coach-monte-carlo.mjs [--games 500] [--start 1] [--step 1]

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { games: 500, start: 1, step: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--games' && i + 1 < argv.length) out.games = Number(argv[++i]);
    else if (a === '--start' && i + 1 < argv.length) out.start = Number(argv[++i]);
    else if (a === '--step' && i + 1 < argv.length) out.step = Number(argv[++i]);
  }
  return out;
}

async function main() {
  const { games, start, step } = parseArgs(process.argv);
  // Import from dist to avoid TS transpile at runtime
  const distRoot = path.resolve(__dirname, '..', 'dist');
  // Provide fetch for local JSON assets used by loaders
  const hasProtocol = (u) => /^(?:[a-z]+:)?\/\//i.test(String(u)) || String(u).startsWith('data:');
  globalThis.fetch = async (url) => {
    if (typeof url === 'string' && !hasProtocol(url)) {
      const p = path.resolve(distRoot, url);
      const txt = await fs.readFile(p, 'utf8');
      return { ok: true, json: async () => JSON.parse(txt) };
    }
    // Fall back to native fetch if available for absolute URLs
    if (typeof globalThis.fetch === 'function') {
      return (globalThis.fetch)(url);
    }
    throw new Error(`No fetch available for URL: ${url}`);
  };

  const coachUrl = pathToFileURL(path.join(distRoot, 'ai', 'CoachProfiles.js')).href;
  const simUrl = pathToFileURL(path.join(distRoot, 'sim', 'Simulator.js')).href;
  const { COACH_PROFILES } = await import(coachUrl);
  const { simulateOneGame } = await import(simUrl);

  const coachNames = Object.keys(COACH_PROFILES);
  const pairs = [];
  for (const a of coachNames) {
    for (const b of coachNames) {
      if (a === b) continue;
      pairs.push([a, b]);
    }
  }

  const results = [];
  for (const [homeCoach, awayCoach] of pairs) {
    let homeWins = 0, awayWins = 0, ties = 0;
    for (let i = 0; i < games; i++) {
      const seed = start + i * step;
      // Home is player, away is ai in Simulator
      const res = await simulateOneGame({ seed, playerPAT: 'auto', playerCoach: homeCoach, aiCoach: awayCoach });
      if (res.winner === 'home') homeWins++;
      else if (res.winner === 'away') awayWins++;
      else ties++;
    }
    const total = homeWins + awayWins + ties;
    results.push({ homeCoach, awayCoach, total, homeWins, awayWins, ties, homeWinPct: homeWins / total, awayWinPct: awayWins / total });
  }

  // Aggregate per-coach overall win rate (as home and as away opponent)
  const perCoach = new Map();
  for (const r of results) {
    const a = r.homeCoach; const b = r.awayCoach;
    if (!perCoach.has(a)) perCoach.set(a, { name: a, wins: 0, losses: 0, ties: 0, games: 0 });
    if (!perCoach.has(b)) perCoach.set(b, { name: b, wins: 0, losses: 0, ties: 0, games: 0 });
    perCoach.get(a).wins += r.homeWins; perCoach.get(a).losses += r.awayWins; perCoach.get(a).ties += r.ties; perCoach.get(a).games += r.total;
    perCoach.get(b).wins += r.awayWins; perCoach.get(b).losses += r.homeWins; perCoach.get(b).ties += r.ties; perCoach.get(b).games += r.total;
  }

  const perCoachArr = Array.from(perCoach.values()).map(c => ({ ...c, winPct: c.games ? c.wins / c.games : 0 }));
  perCoachArr.sort((x, y) => y.winPct - x.winPct);

  // Output concise summary
  console.log('Coach overall win rates (all pairings, home+away aggregated):');
  for (const c of perCoachArr) {
    console.log(`${c.name.padEnd(16)}  win% ${(c.winPct*100).toFixed(1)}  W${c.wins} L${c.losses} T${c.ties}  G${c.games}`);
  }

  console.log('\nHead-to-head (home vs away):');
  for (const r of results) {
    console.log(`${r.homeCoach} vs ${r.awayCoach}  home% ${(r.homeWinPct*100).toFixed(1)}  (${r.homeWins}-${r.awayWins}-${r.ties})`);
  }
}

main().catch((e) => {
  console.error('Monte Carlo failed:', e);
  process.exit(1);
});


