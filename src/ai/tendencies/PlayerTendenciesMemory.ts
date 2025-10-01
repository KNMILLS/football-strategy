// Move utility functions here to break circular dependency
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isRedZone(ballOnFromHome: number, playerIsHome: boolean, possession: 'player'|'ai'): boolean {
  const offenseIsHomeFlag = (possession === 'player') === playerIsHome;
  const yardsToOppGoal = offenseIsHomeFlag ? (100 - ballOnFromHome) : ballOnFromHome;
  return yardsToOppGoal < 20;
}

export type TendencyDistanceBucket = 'short'|'medium'|'long';

function toDistanceBucket(toGo: number): TendencyDistanceBucket {
	if (toGo <= 2) return 'short';
	if (toGo >= 8) return 'long';
	return 'medium';
}

function keyForSituation(down: number, dist: TendencyDistanceBucket, inRedZone: boolean): string {
	const d = Math.max(1, Math.min(4, down));
	return `${d}:${dist}:${inRedZone ? 'RZ' : 'FG'}`;
}

export class PlayerTendenciesMemory {
	private countsByKey: Record<string, { run: number; pass: number }> = Object.create(null);
	private global: { run: number; pass: number } = { run: 0, pass: 0 };

	record(side: 'player'|'ai', playType: 'run'|'pass', ctx: { down: number; toGo: number; ballOnFromHome: number; playerIsHome: boolean; possessing: 'player'|'ai' }): void {
		// Only learn the HUMAN player's offense tendencies
		if (side !== 'player' || ctx.possessing !== 'player') return;
		const inRed = isRedZone(ctx.ballOnFromHome, ctx.playerIsHome, ctx.possessing);
		const k = keyForSituation(ctx.down, toDistanceBucket(ctx.toGo), inRed);
		if (!this.countsByKey[k]) this.countsByKey[k] = { run: 0, pass: 0 };
		this.countsByKey[k]![playType] += 1;
		this.global[playType] += 1;
	}

	// Predict run probability for the player's next play without peeking current selection
	predictRunProbabilityForPlayer(input: { down: number; toGo: number; ballOnFromHome: number; playerIsHome: boolean }): number {
		const inRed = isRedZone(input.ballOnFromHome, input.playerIsHome, 'player');
		const k = keyForSituation(input.down, toDistanceBucket(input.toGo), inRed);
		const counts = this.countsByKey[k] || { run: 0, pass: 0 };
		const g = this.global;
		// Laplace smoothing with small prior; blend bucket with global if sparse
		const bucketN = counts.run + counts.pass;
		const globalN = g.run + g.pass;
		const bucketRun = (counts.run + 1) / (bucketN + 2);
		const globalRun = globalN > 0 ? (g.run / globalN) : 0.5;
		const w = Math.max(0, Math.min(1, bucketN / 6)); // need about 6 samples to fully trust bucket
		return clamp(bucketRun * w + globalRun * (1 - w), 0.1, 0.9);
	}
}

export type PlayerTendenciesMemoryConstructor = typeof PlayerTendenciesMemory;


