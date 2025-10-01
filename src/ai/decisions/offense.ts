import type { AIContext, OffensiveDecision } from './shared';
import { pickPlayFromHand, offensivePassProbability, computeCategoryWeights, categorizeLabel, chooseWeighted } from './shared';
import { decideFourthDown } from './fourthDown';

export function chooseOffenseMixed(ai: AIContext): string | null {
	const hand = ai.getOffenseHand();
	const eligible = hand.filter(c => (c.type === 'run' || c.type === 'pass') && ((): boolean => {
		const restriction = ai.getWhiteSignRestriction(c.label);
		if (restriction == null) return true;
		const offenseIsHome = (ai.state.possession === 'player') === ai.playerIsHome;
		const yardsToOppGoal = offenseIsHome ? (100 - ai.state.ballOn) : ai.state.ballOn;
		return yardsToOppGoal > restriction;
	})());
	if (eligible.length === 0) return null;
	const catWeights = computeCategoryWeights(ai);
	// Build per-card weights from category and allow small jitter to avoid predictability
	const items = eligible.map(c => {
		const cat = categorizeLabel(c.label);
		let weight = (catWeights as any)[cat] || 0.01;
		// Ensure minimum mixing
		weight = Math.max(0.02, weight);
		// Coach bias: passBias nudges pass categories
		if (c.type === 'pass') weight *= (1 + Math.max(0, ai.coach.passBias));
		if (c.type === 'run') weight *= (1 + Math.max(0, -ai.coach.passBias));
		// Situational label-level adjustments to improve variety and EV
		const down = ai.state.down;
		const toGo = ai.state.toGo;
		const quarter = ai.state.quarter;
		const clock = ai.state.clock;
		const offenseScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
		const defenseScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
		const trailing = offenseScore < defenseScore;
		const late = (quarter === 4 && clock <= 5 * 60);

		// First down diversification: down=1 reduce heavy base; boost edge/quick game
		if (down === 1) {
			if (/^Power Up Middle$/i.test(c.label)) weight *= 0.65; // discourage overuse
			if (/^Power Off Tackle$/i.test(c.label)) weight *= 1.15;
			if (/^End Run$/i.test(c.label)) weight *= 1.15;
			if (/^(Sideline Pass|Pop Pass|Flair Pass|Down & Out Pass)$/i.test(c.label)) weight *= 1.10;
		}

		// Short yardage bias (≤2 to go): prefer keeper/slant/off-tackle; de-emphasize base inside
		if (toGo <= 2) {
			if (/^Power Up Middle$/i.test(c.label)) weight *= 0.75;
			if (/^(QB Keeper|Slant Run|Power Off Tackle)$/i.test(c.label)) weight *= 1.20;
			if (/^(Pop Pass|Look In Pass|Button Hook Pass)$/i.test(c.label)) weight *= 1.10; // occasional quick pass
		}

		// Fourth down trick gating: disfavor razzle unless trailing late desperation
		if (down === 4 && /Razzle Dazzle/i.test(c.label)) {
			weight *= (late && trailing) ? 1.0 : 0.01;
		}

		// Late-game press when trailing: slightly favor deep concepts and chunk gains
		if (late && trailing) {
			if (/(Long Bomb|Stop & Go Pass|Corner|Post|Deep)/i.test(c.label)) weight *= 1.15;
			if (/Screen Pass/i.test(c.label)) weight *= 1.05; // safe explosive counter occasionally
		}
		// Small jitter
		const jitter = 0.98 + (ai.rng() * 0.04);
		return { item: c.label, weight: weight * jitter };
	});
	return chooseWeighted(ai.rng, items);
}

export function chooseOffense(ai: AIContext): OffensiveDecision {
	const { state } = ai;
	// Fourth down logic
	if (state.down === 4) {
    const fourth = decideFourthDown(ai);
		if (fourth) {
			if (fourth.kind === 'fieldGoal') {
				const attemptYards = fourth.attemptYards;
				if (attemptYards <= 65) return fourth; // guard improbable but allow tests to stub
			} else if (fourth.kind === 'punt') {
				return fourth;
			} else {
				return fourth;
			}
		}
	}

	// Non-4th down: run/pass selection
	const mixed = chooseOffenseMixed(ai);
	if (mixed) return { kind: 'play', deckName: ai.deckName, playLabel: mixed };
	// Fallback to legacy probabilistic run/pass if categorization produced none
	const passP = offensivePassProbability(ai);
	const isPass = ai.rng() < passP;
	const label = pickPlayFromHand(ai, isPass ? 'pass' : 'run', isPass ? 'run' : 'pass');
	if (label) return { kind: 'play', deckName: ai.deckName, playLabel: label };

	// If no valid play because of white-sign, attempt switching type
	const alt = pickPlayFromHand(ai, isPass ? 'run' : 'pass');
	if (alt) return { kind: 'play', deckName: ai.deckName, playLabel: alt };

	// As extreme fallback: if 4th down and cannot choose play, punt; else default pass play label from any
	if (state.down === 4) return { kind: 'punt' };
	return { kind: 'play', deckName: ai.deckName, playLabel: ai.getOffenseHand()[0]?.label ?? 'Run & Pass Option' };
}

export { pickPlayFromHand, offensivePassProbability };



