import type { AIContext, OffensiveDecision } from './shared';
import { offensivePassProbability, pickPlayFromHand, yardsToOppGoal } from './shared';
import { buildPolicy, toPolicyInputsFromState } from '../policy/NFL2025Policy';

export function decideFourthDown(ai: AIContext): OffensiveDecision | null {
	const { state, coach } = ai;
	const { toGo, ballOn } = state;
	const attemptYards = ai.getFieldGoalAttemptYards(state);
	const fgViable = attemptYards <= 45;

	// Field position info
	const yardsToOpp = yardsToOppGoal(ballOn, ai.playerIsHome, state.possession);
	const onOpponentSide = yardsToOpp <= 50;

	// Urgency
	const trailing = (() => {
		const offScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
		const defScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
		return offScore < defScore;
	})();
	const lateQ4 = state.quarter === 4 && state.clock <= 6 * 60;
	const urgencyBoost = trailing && lateQ4 ? (coach.fourthDownBoost + 0.15) : 0;

	// Go-for-it viable
	let goForItViable = false;
	if (toGo <= 2 && onOpponentSide) goForItViable = true;
	if (toGo <= 4 && yardsToOpp <= 65 && yardsToOpp >= 55 && (coach.aggression + urgencyBoost) > 0.5) goForItViable = true; // around opp 45–35

	// Policy-backed decision first
	try {
		const offenseIsHome = (ai.state.possession === 'player') === ai.playerIsHome;
		const inputs = toPolicyInputsFromState(ai.state, offenseIsHome);
		const policy = buildPolicy();
		const special = policy.chooseFourthDown({
			...inputs,
			// Respect current engine: FG attempts only modeled up to 45 yards
			fgModel: { makeProb: () => (attemptYards > 0 ? (attemptYards <= 45 ? 0.7 : 0.0) : 0.0) },
		});
		if (special === 'field_goal' && attemptYards <= 45) return { kind: 'fieldGoal', attemptYards };
		if (special === 'punt') return { kind: 'punt' };
		if (special === 'go_for_it') {
			const passP = offensivePassProbability(ai);
			const isPass = ai.rng() < passP;
			const label = pickPlayFromHand(ai, isPass ? 'pass' : 'run', isPass ? 'run' : 'pass');
			if (label) return { kind: 'play', deckName: ai.deckName, playLabel: label };
		}
	} catch {}

	// Legacy fallback heuristics
	// Scoring choices
	if (fgViable) {
		// Simple threshold: prefer FG if tie or trailing by <= 3, or on 4th-and-long
		const offScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
		const defScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
		const diff = offScore - defScore;
		if (diff <= 3) {
			return { kind: 'fieldGoal', attemptYards };
		}
	}

	if (goForItViable) {
		// Choose play type based on pass probability
		const passP = offensivePassProbability(ai);
		const isPass = ai.rng() < passP;
		const label = pickPlayFromHand(ai, isPass ? 'pass' : 'run', isPass ? 'run' : 'pass');
		if (label) return { kind: 'play', deckName: ai.deckName, playLabel: label };
	}

	// Default: punt when appropriate field position; else play
	const shouldPunt = (() => {
		// Punt more likely on own side and long to go
		if (onOpponentSide) return false;
		// Deep on own side (own 40 or deeper): be conservative unless urgent late and very short
		const deepOwn = yardsToOpp > 60;
		if (deepOwn && toGo >= 2) {
			const urgentLateAndShort = (state.quarter === 4 && (state.clock <= 6 * 60) && (() => {
				const offScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
				const defScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
				return offScore < defScore;
			})() && toGo <= 1);
			if (!urgentLateAndShort) return true;
		}
		// General own side guidance
		if (toGo >= 5) return true;
		if (yardsToOpp > 50 && toGo >= 3) return true;
		// Conservative coaches punt more
		return (coach.aggression + urgencyBoost) < 0.4;
	})();
	if (shouldPunt) return { kind: 'punt' };

	const passP = offensivePassProbability(ai);
	const isPass = ai.rng() < passP;
	const label = pickPlayFromHand(ai, isPass ? 'pass' : 'run', isPass ? 'run' : 'pass');
	if (label) return { kind: 'play', deckName: ai.deckName, playLabel: label };
	return null;
}


