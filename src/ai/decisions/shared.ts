import type { RNG } from '../../sim/RNG';
import type { CoachProfile } from '../CoachProfiles';
import type { GameState } from '../../domain/GameState';
import type { OffenseCharts } from '../../data/schemas/OffenseCharts';
import { buildPolicy, toPolicyInputsFromState } from '../policy/NFL2025Policy';
import type { PlayerTendenciesMemory } from '../types';

export type OffensiveCard = { id: string; label: string; type: 'run'|'pass'|'punt'|'field-goal' };
export type DefensiveCardLabel =
	| 'Goal Line'|'Short Yardage'|'Inside Blitz'|'Running'|'Run & Pass'|'Pass & Run'|'Passing'|'Outside Blitz'|'Prevent'|'Prevent Deep';

export interface AIContext {
	state: GameState;
	charts: OffenseCharts;
	coach: CoachProfile;
	deckName: 'Pro Style'|'Ball Control'|'Aerial Style'|string;
	playerIsHome: boolean;
	rng: RNG;
	getOffenseHand(): OffensiveCard[];
	getDefenseOptions(): DefensiveCardLabel[];
	isTwoMinute(quarter: number, clock: number): boolean;
	getWhiteSignRestriction(playLabel: string): number | null;
	getFieldGoalAttemptYards(state: GameState): number;
	// Optional per-game memory of tendencies. If provided, defense will adapt over time.
	tendencies?: PlayerTendenciesMemory;
}

export type OffensiveDecision =
	| { kind: 'play'; deckName: string; playLabel: string }
	| { kind: 'punt' }
	| { kind: 'fieldGoal'; attemptYards: number };

export type DefensiveDecision = { kind: 'defense'; label: DefensiveCardLabel };

export type KickoffDecision = { kind: 'kickoff'; type: 'normal'|'onside' };

export function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

export function chooseWeighted<T>(rng: RNG, items: Array<{ item: T; weight: number }>): T {
	const total = items.reduce((s, it) => s + (it.weight > 0 ? it.weight : 0), 0);
	if (total <= 0) return items[0]!.item;
	const r = rng() * total;
	let acc = 0;
	for (const it of items) {
		const w = it.weight > 0 ? it.weight : 0;
		if (r >= acc && r < acc + w) return it.item;
		acc += w;
	}
	return items[items.length - 1]!.item;
}

export function isRedZone(ballOnFromHome: number, playerIsHome: boolean, possession: GameState['possession']): boolean {
	// Convert to yards to opponent goal line from offense perspective
	// ballOn is from home perspective 0..100. If offense is home, opp goal is 100; else 0.
	const offenseIsHomeFlag = (possession === 'player') === playerIsHome;
	const yardsToOppGoal = offenseIsHomeFlag ? (100 - ballOnFromHome) : ballOnFromHome;
	return yardsToOppGoal < 20;
}

export function yardsToOppGoal(ballOnFromHome: number, playerIsHome: boolean, possession: GameState['possession']): number {
	const offenseIsHomeFlag = (possession === 'player') === playerIsHome;
	return offenseIsHomeFlag ? (100 - ballOnFromHome) : ballOnFromHome;
}

export type OffenseCategory = 'inside_like'|'quick_like'|'draw_screen'|'deep_like'|'gadget_like';

export function offenseIsHome(ai: AIContext): boolean { return (ai.state.possession === 'player') === ai.playerIsHome; }

export function offenseAbsFromHome(ai: AIContext): number { return offenseIsHome(ai) ? ai.state.ballOn : (100 - ai.state.ballOn); }

export function fieldZoneId(ai: AIContext): 'own_1_20'|'own_21_40'|'mid_41_59'|'opp_40_31'|'opp_30_11'|'red_10_1' {
	const abs = offenseAbsFromHome(ai);
	if (abs <= 20) return 'own_1_20';
	if (abs <= 40) return 'own_21_40';
	if (abs <= 59) return 'mid_41_59';
	if (abs <= 69) return 'opp_40_31';
	if (abs <= 89) return 'opp_30_11';
	return 'red_10_1';
}

export function categorizeLabel(label: string): OffenseCategory {
	const l = label.toLowerCase();
	// Gadgets
	if (/reverse|razzle|flea|double pass|end around/.test(l)) return 'gadget_like';
	// Draw/Screen
	if (/\bdraw\b/.test(l)) return 'draw_screen';
	if (/screen pass/.test(l)) return 'draw_screen';
	// Deep
	if (/long bomb|stop & go|stop and go|streak|go route|corner|post|deep/.test(l)) return 'deep_like';
	// Quick game
	if (/flair pass|sideline pass|look in pass|pop pass|button hook|down & out pass|down & in pass|quick pass|slant/.test(l)) return 'quick_like';
	// Inside/ground (default for runs and RPO)
	return 'inside_like';
}

export function computeCategoryWeights(ai: AIContext): Record<OffenseCategory, number> {
	const { state } = ai;
	const zone = fieldZoneId(ai);
	const short = state.toGo <= 2;
	const long = state.toGo >= 8;
	const late = (state.quarter === 2 || state.quarter === 4) && state.clock <= 300;
	const twoMin = state.clock <= 120;
	const offenseScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
	const defenseScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
	const trailing = offenseScore < defenseScore;

	// Baseline
	let w: Record<OffenseCategory, number> = { inside_like: 0.45, quick_like: 0.30, draw_screen: 0.10, deep_like: 0.10, gadget_like: 0.05 };

	// Backed-up safety guardrail
	if (zone === 'own_1_20') {
		w = { inside_like: 0.55, quick_like: 0.25, draw_screen: 0.15, deep_like: 0.05, gadget_like: 0.0 };
	}

	// Short-yardage emphasis
	if (short && (state.down === 3 || state.down === 4)) {
		w = { inside_like: 0.65, quick_like: 0.15, draw_screen: 0.10, deep_like: 0.0, gadget_like: Math.min(w.gadget_like, 0.10) };
	} else if (short && (zone === 'opp_40_31' || zone === 'opp_30_11' || zone === 'red_10_1')) {
		w = { inside_like: 0.70, quick_like: 0.15, draw_screen: 0.10, deep_like: 0.0, gadget_like: Math.min(w.gadget_like, 0.05) };
	}

	// Long-yardage
	if (long && zone !== 'own_1_20') {
		w = { inside_like: 0.35, quick_like: 0.25, draw_screen: 0.20, deep_like: 0.20, gadget_like: Math.min(w.gadget_like, 0.05) };
	}

	// Late-game tilt
	if ((late || twoMin) && trailing) {
		w.inside_like = Math.max(0, w.inside_like - 0.10);
		w.quick_like = w.quick_like + 0.10;
		w.deep_like = w.deep_like + 0.10;
	} else if ((late || twoMin) && !trailing) {
		w.inside_like = w.inside_like + 0.10;
		w.quick_like = Math.max(0, w.quick_like - 0.05);
		w.deep_like = Math.max(0, w.deep_like - 0.05);
	}

	// Normalize
	const sum = w.inside_like + w.quick_like + w.draw_screen + w.deep_like + w.gadget_like;
	return sum > 0 ? {
		inside_like: w.inside_like / sum,
		quick_like: w.quick_like / sum,
		draw_screen: w.draw_screen / sum,
		deep_like: w.deep_like / sum,
		gadget_like: w.gadget_like / sum,
	} : w;
}

function passesWhiteSign(ai: AIContext, playLabel: string): boolean {
	const restriction = ai.getWhiteSignRestriction(playLabel);
	if (restriction == null) return true;
	const yards = yardsToOppGoal(ai.state.ballOn, ai.playerIsHome, ai.state.possession);
	return yards > restriction;
}

export function pickPlayFromHand(ai: AIContext, desiredType: 'run'|'pass', fallbackType?: 'run'|'pass'): string | null {
	const hand = ai.getOffenseHand();
	// Gate razzle dazzle frequency: ≤1 per drive; avoid in own red zone unless trailing late
	const inOwnRed = isRedZone(ai.state.ballOn, ai.playerIsHome, ai.state.possession) && ((ai.state.possession === 'player') === ai.playerIsHome) && (ai.state.ballOn <= 20);
	const offenseScore = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'];
	const defenseScore = ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
	const trailingLate = (ai.state.quarter === 4 && ai.state.clock <= 5 * 60 && offenseScore < defenseScore);
	const fourthDown = ai.state.down === 4;
	let razzleUsedThisDrive = false;
	try { razzleUsedThisDrive = (ai as any).__rd_used__ === ai.state.possession; } catch {}
	const isRazzle = (label: string) => /razzle dazzle/i.test(label);
	const primary = hand.filter(c => {
		if (c.type !== desiredType) return false;
		if (!passesWhiteSign(ai, c.label)) return false;
		if (isRazzle(c.label)) {
			if (razzleUsedThisDrive) return false;
			if (inOwnRed && !trailingLate) return false;
			// Additional guard: avoid trick play on 4th down unless trailing late
			if (fourthDown && !trailingLate) return false;
		}
		return true;
	});
	if (primary.length > 0) {
		const idx = Math.floor(ai.rng() * primary.length);
		const label = primary[idx]!.label;
		if (isRazzle(label)) { try { (ai as any).__rd_used__ = ai.state.possession; } catch {} }
		return label;
	}
	if (fallbackType) {
		const alt = hand.filter(c => c.type === fallbackType && passesWhiteSign(ai, c.label));
		if (alt.length > 0) {
			const idx = Math.floor(ai.rng() * alt.length);
			return alt[idx]!.label;
		}
	}
	// As last resort, pick any legal
	const any = hand.filter(c => (c.type === 'run' || c.type === 'pass') && passesWhiteSign(ai, c.label));
	if (any.length > 0) {
		const idx = Math.floor(ai.rng() * any.length);
		const label = any[idx]!.label;
		if (isRazzle(label)) { try { (ai as any).__rd_used__ = ai.state.possession; } catch {} }
		return label;
	}
	return null;
}

export function offensivePassProbability(ai: AIContext): number {
	const { state, coach } = ai;
	const { down, toGo, quarter, clock } = state;
	const red = isRedZone(state.ballOn, ai.playerIsHome, state.possession);
	let passP = 0.5;
	// Base heuristics
	if (down === 1 || down === 2) {
		if (toGo <= 3) passP -= 0.25; // run weight +0.25
		if (toGo >= 8) passP += 0.35;
	}
	if (down === 3) {
		passP += 0.45;
		if (toGo <= 2) passP -= 0.35; // keep some run chance on 3rd-and-short
	}
	if (red) {
		if (toGo <= 3) passP -= 0.3;
		if (toGo >= 8) passP += 0.35;
	}

	const twoMin = ai.isTwoMinute(quarter, clock);
	const scoreDiff = ai.state.score[(ai.state.possession === 'player') ? 'player' : 'ai'] - ai.state.score[(ai.state.possession === 'player') ? 'ai' : 'player'];
	if (twoMin && scoreDiff < 0) passP += 0.35;
	if (twoMin && scoreDiff > 0 && toGo <= 2) passP -= 0.2;
	// Slight additional tilt to pass in late Q4 when trailing
	if (quarter === 4 && scoreDiff < 0) passP += 0.1;

	passP += coach.passBias;
	// Policy late-game bias and archetype adjustment (lightweight)
	try {
		const offenseIsHomeFlag = (ai.state.possession === 'player') === ai.playerIsHome;
		const inputs = toPolicyInputsFromState(ai.state, offenseIsHomeFlag);
		const policy = buildPolicy();
		const tempo = policy.chooseTempo(inputs).tempo;
		if ((inputs.quarter === 2 || inputs.quarter === 4) && inputs.time_remaining_sec <= 300 && inputs.score_diff < 0) {
			passP += 0.15; // tilt pass when trailing late
		}
		if (tempo === 'burn_clock' && toGo <= 3) passP -= 0.10;
	} catch {}
	return clamp(passP, 0.1, 0.9);
}



