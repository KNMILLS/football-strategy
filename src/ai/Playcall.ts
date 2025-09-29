import type { RNG } from '../sim/RNG';
import type { CoachProfile } from './CoachProfiles';
import type { GameState } from '../domain/GameState';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';
// Validators are centralized but AI selection remains unchanged to preserve legacy baselines

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
}

export type OffensiveDecision =
  | { kind: 'play'; deckName: string; playLabel: string }
  | { kind: 'punt' }
  | { kind: 'fieldGoal'; attemptYards: number };

export type DefensiveDecision = { kind: 'defense'; label: DefensiveCardLabel };

export type KickoffDecision = { kind: 'kickoff'; type: 'normal'|'onside' };

function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

function chooseWeighted<T>(rng: RNG, items: Array<{ item: T; weight: number }>): T {
  const total = items.reduce((s, it) => s + (it.weight > 0 ? it.weight : 0), 0);
  if (total <= 0) return items[0].item;
  const r = rng() * total;
  let acc = 0;
  for (const it of items) {
    const w = it.weight > 0 ? it.weight : 0;
    if (r >= acc && r < acc + w) return it.item;
    acc += w;
  }
  return items[items.length - 1].item;
}

function isRedZone(ballOnFromHome: number, playerIsHome: boolean, possession: GameState['possession']): boolean {
  // Convert to yards to opponent goal line from offense perspective
  // ballOn is from home perspective 0..100. If offense is home, opp goal is 100; else 0.
  const offenseIsHome = (possession === 'player') === playerIsHome;
  const yardsToOppGoal = offenseIsHome ? (100 - ballOnFromHome) : ballOnFromHome;
  return yardsToOppGoal < 20;
}

function yardsToOppGoal(ballOnFromHome: number, playerIsHome: boolean, possession: GameState['possession']): number {
  const offenseIsHome = (possession === 'player') === playerIsHome;
  return offenseIsHome ? (100 - ballOnFromHome) : ballOnFromHome;
}

function passesWhiteSign(ai: AIContext, playLabel: string): boolean {
  const restriction = ai.getWhiteSignRestriction(playLabel);
  if (restriction == null) return true;
  const yards = yardsToOppGoal(ai.state.ballOn, ai.playerIsHome, ai.state.possession);
  return yards > restriction;
}

function pickPlayFromHand(ai: AIContext, desiredType: 'run'|'pass', fallbackType?: 'run'|'pass'): string | null {
  const hand = ai.getOffenseHand();
  const primary = hand.filter(c => c.type === desiredType && passesWhiteSign(ai, c.label));
  if (primary.length > 0) {
    const idx = Math.floor(ai.rng() * primary.length);
    return primary[idx].label;
  }
  if (fallbackType) {
    const alt = hand.filter(c => c.type === fallbackType && passesWhiteSign(ai, c.label));
    if (alt.length > 0) {
      const idx = Math.floor(ai.rng() * alt.length);
      return alt[idx].label;
    }
  }
  // As last resort, pick any legal
  const any = hand.filter(c => (c.type === 'run' || c.type === 'pass') && passesWhiteSign(ai, c.label));
  if (any.length > 0) {
    const idx = Math.floor(ai.rng() * any.length);
    return any[idx].label;
  }
  return null;
}

function offensivePassProbability(ai: AIContext): number {
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

  passP += coach.passBias;
  return clamp(passP, 0.1, 0.9);
}

function decideFourthDown(ai: AIContext): OffensiveDecision | null {
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
    if (toGo >= 5) return true;
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
      const label = pool[Math.floor(rng() * pool.length)];
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

  // Small randomness via weighted choice
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
    return { item: label, weight };
  });
  const label = chooseWeighted(rng, weights);
  return { kind: 'defense', label };
}

export function chooseKickoff(ai: { state: GameState; coach: CoachProfile; rng: RNG }): KickoffDecision {
  const { state, coach, rng } = ai;
  const offenseScore = state.score[(state.possession === 'player') ? 'player' : 'ai'];
  const defenseScore = state.score[(state.possession === 'player') ? 'ai' : 'player'];
  const trailing = offenseScore < defenseScore; // kicking team is offense after a score or start; assume this function used at kickoff time
  const lateQ4Tight = state.quarter === 4 && state.clock <= 2 * 60;
  const downBigLate = state.quarter === 4 && state.clock <= 4 * 60 && (defenseScore - offenseScore) >= 9;

  let onsideProb = 0;
  if (trailing && (lateQ4Tight || downBigLate)) {
    onsideProb = coach.onsideAggressive ? 0.7 : 0.3;
  }
  const pickOnside = rng() < onsideProb;
  return { kind: 'kickoff', type: pickOnside ? 'onside' : 'normal' };
}


