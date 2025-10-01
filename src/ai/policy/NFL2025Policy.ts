import type { GameState } from '../../domain/GameState';

export type TeamArchetype = 'Pro'|'Aerial'|'BallControl';

export interface PolicyInputs {
  quarter: number; // 1..4
  time_remaining_sec: number; // in current quarter
  half: 1|2;
  score_diff: number; // offense - defense
  down: 1|2|3|4;
  distance_to_go_yd: number;
  yardline_100: number; // 1..99 from offense goal
  has_two_minute_warning: boolean;
  wind_mph?: number;
  roof?: 'open'|'closed'|'retractable';
  surface?: 'grass'|'turf';
  kicker_make_table?: Array<{ max_yd: number; p_make: number }>;
  team_archetype: TeamArchetype;
  home_or_road: 'home'|'road';
  underdog: boolean;
  possession_after_score_pref: 'normal'|'want_OT';
}

export interface FGEnvAdjust {
  wind_head_per_10mph: number;
  wind_tail_per_10mph: number;
  altitude_high: number;
  wet_surface: number;
  elite_kicker_bonus: number;
  weak_kicker_malus: number;
}

export interface FGModelConfig {
  baseline: Array<{ max_yd: number; p_make: number }>;
  adjustments: FGEnvAdjust;
}

export interface FGModel {
  makeProb(attemptYards: number, ctx: { wind_mph?: number; roof?: string; surface?: string; kicker?: 'elite'|'weak'|'avg' }): number;
}

function pickBucketProb(ay: number, table: Array<{ max_yd: number; p_make: number }>): number {
  for (const row of table) {
    if (ay <= row.max_yd) return row.p_make;
  }
  return 0.0;
}

export function createFGModel(cfg: FGModelConfig, overrides?: Array<{ max_yd: number; p_make: number }>): FGModel {
  const table = overrides && overrides.length ? overrides : cfg.baseline;
  return {
    makeProb(attemptYards, ctx) {
      let p = pickBucketProb(Math.round(attemptYards), table);
      // Simple environment adjustments
      const wind = Math.abs(ctx.wind_mph ?? 0);
      const head = (ctx.wind_mph ?? 0) > 0 ? 1 : (ctx.wind_mph ?? 0) < 0 ? -1 : 0; // positive means headwind
      if (head > 0) p += cfg.adjustments.wind_head_per_10mph * (wind / 10);
      if (head < 0) p += cfg.adjustments.wind_tail_per_10mph * (wind / 10);
      if (ctx.surface === 'grass') p += 0; // neutral default; could tune per JSON
      // Kicker quality
      const k = ctx.kicker ?? 'avg';
      if (k === 'elite') p += cfg.adjustments.elite_kicker_bonus;
      if (k === 'weak') p += cfg.adjustments.weak_kicker_malus;
      return Math.max(0, Math.min(1, p));
    },
  };
}

export type SpecialDecision = 'field_goal'|'punt'|'go_for_it'|'qb_kneel'|'spike'|'hail_mary'|'normal_play';
export type Tempo = 'normal'|'hurry_up'|'burn_clock'|'no_huddle';

export interface PolicyOutputs {
  playcall_weights?: Record<string, number>;
  tempo: Tempo;
  special: SpecialDecision;
  explanations: string[];
}

export interface PolicyAPI {
  chooseFourthDown(ctx: PolicyInputs & { fgModel: FGModel }): SpecialDecision;
  choosePAT(ctx: { quarter: number; time_remaining_sec: number; score_diff: number }): 'kick'|'two';
  chooseTempo(ctx: PolicyInputs): { tempo: Tempo };
}

export function buildPolicy(): PolicyAPI {
  // Constants from JSON
  const fgConfig: FGModelConfig = {
    baseline: [
      { max_yd: 29, p_make: 0.97 },
      { max_yd: 39, p_make: 0.92 },
      { max_yd: 49, p_make: 0.82 },
      { max_yd: 55, p_make: 0.68 },
      { max_yd: 60, p_make: 0.50 },
      { max_yd: 66, p_make: 0.32 },
    ],
    adjustments: {
      wind_head_per_10mph: -0.05,
      wind_tail_per_10mph: +0.03,
      altitude_high: +0.03,
      wet_surface: -0.03,
      elite_kicker_bonus: +0.04,
      weak_kicker_malus: -0.04,
    },
  };

  const fgModel = createFGModel(fgConfig);

  function chooseFourthDown(ctx: PolicyInputs & { fgModel?: FGModel }): SpecialDecision {
    const fg = ctx.fgModel || fgModel;
    // Quick field zones
    const yl = ctx.yardline_100;
    const toGo = ctx.distance_to_go_yd;
    // NFL-style thresholds per JSON matrices (simplified)
    // Compute kick distance
    const kickDistance = (100 - yl) + 17;
    const pMake = fg.makeProb(kickDistance, {} as any);

    // Basic neutral early matrix
    const early = (ctx.quarter === 1 || (ctx.quarter === 2 && ctx.time_remaining_sec > 300) || (ctx.quarter === 3 && ctx.time_remaining_sec > 300));
    const late = (ctx.quarter === 2 || ctx.quarter === 4) && ctx.time_remaining_sec <= 300;
    const twoMin = ctx.time_remaining_sec <= 120;
    const trailing = ctx.score_diff < 0;

    if (early) {
      if (yl <= 40) {
        if (toGo <= 1) return 'punt';
        if (toGo <= 2 && yl >= 35) return pMake >= 0.75 ? 'field_goal' : 'punt';
        return 'punt';
      }
      if (yl >= 41 && yl <= 59) {
        if (toGo <= 2) return 'go_for_it';
        if (toGo <= 4) return 'go_for_it'; // consider_go → go_for_it in simplified model
        return 'punt';
      }
      if (yl >= 60 && yl <= 69) {
        if (toGo <= 2) return 'go_for_it';
        if (toGo <= 5) return 'go_for_it';
        return pMake >= 0.75 ? 'field_goal' : 'punt';
      }
      if (yl >= 70) {
        if (toGo <= 2) return 'go_for_it';
        if (toGo <= 5) return 'go_for_it';
        return pMake >= 0.7 ? 'field_goal' : (pMake >= 0.5 ? 'field_goal' : 'go_for_it');
      }
    }

    if (late && trailing) {
      if (yl >= 50 && toGo <= 5) return 'go_for_it';
      if (yl >= 60 && toGo <= 7) return 'go_for_it';
      if (yl >= 70 && toGo <= 10) return 'go_for_it';
      if (yl < 40 && twoMin && toGo <= 2) return 'go_for_it';
    }

    if (late && !trailing) {
      if (yl >= 80 && toGo <= 1) return 'go_for_it';
      if (yl >= 57 && (ctx.down >= 2 || ctx.time_remaining_sec <= 30)) return pMake >= 0.55 ? 'field_goal' : 'punt';
      return pMake >= 0.62 && yl >= 60 ? 'field_goal' : 'punt';
    }

    // Default punt rule
    if (yl <= 59) return 'punt';
    // Fringe
    return pMake >= 0.62 ? 'field_goal' : (toGo <= 2 ? 'go_for_it' : 'punt');
  }

  function choosePAT(ctx: { quarter: number; time_remaining_sec: number; score_diff: number }): 'kick'|'two' {
    if (ctx.quarter < 4 || ctx.time_remaining_sec > 300) {
      // Kick unless trailing big
      if (ctx.score_diff <= -9) return 'two';
      return 'kick';
    }
    if (ctx.score_diff === -8) return 'two';
    if (ctx.score_diff === -5) return 'kick';
    if (ctx.score_diff === -4) return 'two';
    return 'kick';
  }

  function chooseTempo(ctx: PolicyInputs): { tempo: Tempo } {
    const trailing = ctx.score_diff < 0;
    const lead9 = ctx.score_diff >= 9;
    const late = (ctx.quarter === 2 || ctx.quarter === 4) && ctx.time_remaining_sec <= 300;
    const twoMin = ctx.time_remaining_sec <= 120;
    if ((late || twoMin) && trailing) return { tempo: 'hurry_up' };
    if ((late || twoMin) && lead9) return { tempo: 'burn_clock' };
    return { tempo: 'normal' };
  }

  return { chooseFourthDown, choosePAT, chooseTempo };
}

// Helpers to convert engine GameState to PolicyInputs for offense side
export function toPolicyInputsFromState(st: GameState, offenseIsHome: boolean): PolicyInputs {
  const offenseIsPlayer = st.possession === 'player';
  const offenseScore = st.score[offenseIsPlayer ? 'player' : 'ai'];
  const defenseScore = st.score[offenseIsPlayer ? 'ai' : 'player'];
  const score_diff = offenseScore - defenseScore;
  const quarter = st.quarter;
  const time_remaining_sec = st.clock;
  const half: 1|2 = quarter <= 2 ? 1 : 2;
  const down = st.down as 1|2|3|4;
  const distance_to_go_yd = st.toGo;
  const yardline_from_home = st.ballOn;
  const yardline_100 = offenseIsHome ? yardline_from_home : (100 - yardline_from_home);
  const has_two_minute_warning = (quarter === 2 || quarter === 4) && time_remaining_sec > 0 && time_remaining_sec > 120;
  return {
    quarter,
    time_remaining_sec,
    half,
    score_diff,
    down,
    distance_to_go_yd,
    yardline_100,
    has_two_minute_warning,
    team_archetype: 'Pro',
    home_or_road: offenseIsHome ? 'home' : 'road',
    underdog: false,
    possession_after_score_pref: 'normal',
  };
}


