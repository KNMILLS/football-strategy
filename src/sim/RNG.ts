export type RNG = () => number;

export function createLCG(seed: number): RNG {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next(): number {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function rollD6(rng: RNG): number {
  return Math.floor(rng() * 6) + 1;
}

// New LCG for dice, per spec: s_{n+1} = (1103515245 * s_n + 12345) mod 2^31
// Seed: s_0 = seed; next() returns r = s / 2^31
export function createDiceLCG(seed: number): RNG {
  const MOD = 2 ** 31; // 2147483648
  const A = 1103515245;
  const C = 12345;
  let s = (seed >>> 0) % MOD;
  return function next(): number {
    s = (A * s + C) % MOD;
    return s / MOD;
  };
}


