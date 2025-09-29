import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { simulateOneGame } from '../../src/sim/Simulator';

function installFetchStub() {
	// @ts-expect-error attach global
	globalThis.fetch = (async (url: string) => {
		const p = url.replace(/^\/?/, '');
		const abs = path.resolve(process.cwd(), p);
		const body = await fs.readFile(abs, 'utf8');
		return {
			ok: true,
			status: 200,
			json: async () => JSON.parse(body),
			text: async () => body,
		} as any;
	}) as any;
}

describe('full-game log snapshot', () => {
	it('matches baseline for seed=1, PAT kick', async () => {
		installFetchStub();
		const res = await simulateOneGame({ seed: 1, playerPAT: 'kick' });
		const actual = res.log;
		const baselinePath = path.resolve(process.cwd(), 'tests', 'golden', 'baselines', 'log_seed1.txt');
		const expected = await fs.readFile(baselinePath, 'utf8');
		expect(actual).toEqual(expected);
	});
});


