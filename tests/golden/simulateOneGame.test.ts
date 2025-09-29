import { beforeAll, describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { simulateOneGame } from '../../src/sim/Simulator';

let baseline: any;

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

beforeAll(async () => {
	const p = path.resolve(process.cwd(), 'tests', 'golden', 'baselines', 'sim_one_game.json');
	baseline = JSON.parse(await fs.readFile(p, 'utf8'));
});

describe('simulateOneGame golden master', () => {
	for (const c of [
		{ seed: 1, playerPAT: 'kick' },
		{ seed: 42, playerPAT: 'two' },
		{ seed: 1337, playerPAT: 'auto' },
		{ seed: 2025, playerPAT: 'kick' },
	]) {
		it(`seed=${c.seed} PAT=${c.playerPAT}`, async () => {
			installFetchStub();
			const out = await simulateOneGame({ seed: c.seed, playerPAT: c.playerPAT as any });
			const expected = baseline.cases.find((x: any) => x.seed === c.seed && x.playerPAT === c.playerPAT)?.result;
			expect({ home: out.home, away: out.away, winner: out.winner }).toEqual(expected);
		});
	}
});


