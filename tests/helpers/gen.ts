import { createLCG, type RNG } from '../../src/sim/RNG';
import { COACH_PROFILES, type CoachProfile } from '../../src/ai/CoachProfiles';

export interface SeedCase {
  seed: number;
  playerCoach: CoachProfile;
  aiCoach: CoachProfile;
  deckName: 'Pro Style'|'Ball Control'|'Aerial Style';
  playerPAT: 'kick'|'two'|'auto';
  startingPossession: 'player'|'ai';
}

const DECKS: Array<'Pro Style'|'Ball Control'|'Aerial Style'> = ['Pro Style','Ball Control','Aerial Style'];
const PAT_STRATS: Array<'kick'|'two'|'auto'> = ['kick','two','auto'];
const COACH_LIST = Object.values(COACH_PROFILES);

export function rngFromSeed(seed: number): RNG {
  return createLCG(seed);
}

export function pick<T>(rng: RNG, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

export function genCase(seed: number): SeedCase {
  const rng = rngFromSeed(seed);
  const playerCoach = pick(rng, COACH_LIST);
  const aiCoach = pick(rng, COACH_LIST);
  const deckName = pick(rng, DECKS);
  const playerPAT = pick(rng, PAT_STRATS);
  const startingPossession = rng() < 0.5 ? 'player' : 'ai';
  return { seed, playerCoach, aiCoach, deckName, playerPAT, startingPossession };
}

export function genSeeds(count: number, baseSeed = 12345): number[] {
  const rng = rngFromSeed(baseSeed);
  const seeds: number[] = [];
  for (let i = 0; i < count; i++) seeds.push(Math.floor(rng() * 1e9) + 1);
  return seeds;
}


