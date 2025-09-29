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


