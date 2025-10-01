import type { RNG } from '../sim/RNG';

export interface PenaltyInfo { on: 'offense' | 'defense'; yards: number; firstDown?: boolean }

export function maybePenalty(rng: RNG): PenaltyInfo | null {
  if (rng() < 0.1) {
    const on = rng() < 0.5 ? 'offense' : 'defense';
    const yards = rng() < 0.5 ? 5 : 10;
    return { on, yards };
  }
  return null;
}
