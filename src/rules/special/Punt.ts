import type { RNG } from '../../sim/RNG';

export const PUNT_DISTANCE_TABLE: Record<number, number> = {
  2: 30, 3: 35, 4: 38, 5: 40, 6: 42, 7: 43, 8: 44, 9: 46, 10: 48, 11: 50, 12: 52,
};

export const PUNT_RETURN_TABLE: Record<number, { type?: 'LG' | 'FC'; yards?: number }> = {
  2: { type: 'LG' },
  3: { yards: 20 },
  4: { yards: 15 },
  5: { yards: 12 },
  6: { yards: 10 },
  7: { yards: 8 },
  8: { yards: 6 },
  9: { yards: 5 },
  10: { yards: 3 },
  11: { yards: 0 },
  12: { type: 'FC' },
};

export interface PuntContext {
  ballOn: number; // 0..100
  puntingTeam: 'player' | 'ai';
}

export interface PuntOutcome {
  ballOn: number;
  possessionFlips: boolean;
  fumbleRecoveredByKickingTeam: boolean;
  touchback: boolean;
}

export function rollD6(rng: RNG): number { return Math.floor(rng() * 6) + 1; }

export function resolvePunt(ctx: PuntContext, rng: RNG, resolveLongGain: (rng: RNG) => number): PuntOutcome {
  const puntingIsPlayer = ctx.puntingTeam === 'player';
  // Distance
  const distRoll = rollD6(rng) + rollD6(rng);
  const puntDistance = PUNT_DISTANCE_TABLE[distRoll] ?? 40;
  let ballOn = ctx.ballOn + (puntingIsPlayer ? puntDistance : -puntDistance);
  // End zone over/through
  if (ballOn > 100 || ballOn < 0) {
    // Through end zone: touchback to 20 from receiving side
    ballOn = puntingIsPlayer ? 20 : 80;
    return { ballOn, possessionFlips: true, fumbleRecoveredByKickingTeam: false, touchback: true };
  }
  if (ballOn === 100 || ballOn === 0) {
    // Lands in end zone: for purity, assume down at 20 (no UI choice) — matches default AI choice when not trailing late
    ballOn = puntingIsPlayer ? 80 : 20;
    return { ballOn, possessionFlips: true, fumbleRecoveredByKickingTeam: false, touchback: true };
  }
  // In play: resolve return
  const retRoll = rollD6(rng) + rollD6(rng);
  const ret = PUNT_RETURN_TABLE[retRoll] || { yards: 0 };
  let returnYards = 0;
  let fumbleTurnover = false;
  if (ret.type === 'FC') {
    returnYards = 0;
  } else if (ret.type === 'LG') {
    returnYards = resolveLongGain(rng);
  } else {
    returnYards = ret.yards || 0;
    if (retRoll <= 4) {
      if (rng() < 0.15) {
        fumbleTurnover = rng() < 0.5;
      }
    }
  }
  if (puntingIsPlayer) ballOn -= returnYards; else ballOn += returnYards;
  ballOn = Math.max(0, Math.min(100, ballOn));
  if (fumbleTurnover) {
    // Kicking team recovers: possession does not flip
    return { ballOn, possessionFlips: false, fumbleRecoveredByKickingTeam: true, touchback: false };
  }
  return { ballOn, possessionFlips: true, fumbleRecoveredByKickingTeam: false, touchback: false };
}
