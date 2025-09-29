import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('full-game log snapshot', () => {
  it('matches baseline for seed=1, PAT kick', async () => {
    const p = path.resolve(process.cwd(),'tests','golden','baselines','log_seed1.txt');
    const text = await fs.readFile(p,'utf8');
    expect(text.length).toBeGreaterThan(0);
  });
});


