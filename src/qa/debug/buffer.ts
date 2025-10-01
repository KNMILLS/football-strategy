type DebugBuffer = { entries: string[]; seed?: number };

const debugBuffer: DebugBuffer = { entries: [] };

export function pushDebugEntry(text: string): void {
  try { debugBuffer.entries.push(String(text)); } catch {}
}

export function resetDebugEntries(): void {
  debugBuffer.entries = [];
}

export function setDebugSeed(seed: number): void {
  debugBuffer.seed = seed;
}

export function getDebugSeed(): number | undefined {
  return debugBuffer.seed;
}

export function getDebugEntries(): string[] {
  return debugBuffer.entries.slice();
}


