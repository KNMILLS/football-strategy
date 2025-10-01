import type { AIContext, DefensiveDecision, DefensiveCardLabel } from './shared';
import { chooseWeighted, isRedZone } from './shared';

export function chooseDefense(ai: AIContext): DefensiveDecision {
	const { state, rng } = ai;
	const { down, toGo, quarter, clock } = state;
	const options = ai.getDefenseOptions();
	const red = isRedZone(state.ballOn, ai.playerIsHome, state.possession);

	const offenseScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
	const defenseScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
	const leading = defenseScore > offenseScore; // defense is opposing the offense

	const late = quarter === 4 && clock <= 2 * 60;
	if (late && leading && (defenseScore - offenseScore) >= 6) {
		const prefer: DefensiveCardLabel[] = ['Prevent Deep', 'Prevent'];
		const pool = prefer.filter(p => options.includes(p));
		if (pool.length > 0) {
			const label = pool[Math.floor(rng() * pool.length)]!;
			return { kind: 'defense', label };
		}
	}

	let bucket: 'short'|'medium'|'long' = 'medium';
	if (toGo <= 2) bucket = 'short';
	else if (toGo >= 8) bucket = 'long';

	if (red && (state.toGo <= 3 || state.down === 1)) bucket = 'short';

	let candidates: DefensiveCardLabel[] = [];
	if (bucket === 'short') candidates = ['Goal Line', 'Short Yardage', 'Inside Blitz'];
	else if (bucket === 'medium') candidates = ['Run & Pass', 'Pass & Run'];
	else candidates = ['Passing', 'Outside Blitz'];

	if (bucket === 'long' && (toGo >= 14) && (quarter === 4 && clock <= 5 * 60)) {
		candidates = ['Prevent Deep', 'Passing'];
	}

	const available = candidates.filter(c => options.includes(c));
	const pick = available.length ? available : options;

	// Small randomness via weighted choice, with adaptive bias from player tendencies when AI is defending the user
	const weights: Array<{ item: DefensiveCardLabel; weight: number }> = pick.map(label => {
		let weight = 1;
		if (bucket === 'short') {
			if (label === 'Goal Line') weight = 1.2;
			if (label === 'Short Yardage') weight = 1.4;
			if (label === 'Inside Blitz') weight = 1.1;
		} else if (bucket === 'medium') {
			if (label === 'Run & Pass') weight = 1.2;
			if (label === 'Pass & Run') weight = 1.2;
		} else {
			if (label === 'Passing') weight = 1.3;
			if (label === 'Outside Blitz') weight = 1.1;
			if (label === 'Prevent Deep') weight = 1.4;
		}

		// Tendencies: only adapt when defending against the player (do not assume knowledge of current play)
		try {
			if (ai.tendencies && state.possession === 'player') {
				const runProb = ai.tendencies.predictRunProbabilityForPlayer({
					down,
					toGo,
					ballOnFromHome: state.ballOn,
					playerIsHome: ai.playerIsHome,
				});
				const passProb = 1 - runProb;
				// Map run-lean to heavier run-stopping calls; pass-lean to pass-stopping
				const runBias = Math.max(0, runProb - 0.5) * 2; // 0..1
				const passBias = Math.max(0, passProb - 0.5) * 2; // 0..1
				if (runBias > 0) {
					if (label === 'Goal Line' || label === 'Short Yardage' || label === 'Inside Blitz' || label === 'Running') {
						weight *= (1 + 0.5 * runBias);
					}
				}
				if (passBias > 0) {
					if (label === 'Passing' || label === 'Outside Blitz' || label === 'Prevent' || label === 'Prevent Deep' || label === 'Pass & Run') {
						weight *= (1 + 0.5 * passBias);
					}
				}
			}
		} catch {}

		return { item: label, weight };
	});
	const label = chooseWeighted(rng, weights);
	// If options were empty (shouldn't happen), default to a safe label
	return { kind: 'defense', label: (label ?? 'Run & Pass') as DefensiveCardLabel };
}


