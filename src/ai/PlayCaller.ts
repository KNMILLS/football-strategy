import type { RNG } from '../sim/RNG';
import { createLCG } from '../sim/RNG';
import type { GameState } from '../domain/GameState';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';
import { OpponentModel, categorizeDefenseLabel, categorizeOffenseLabel, toClockPhase, toFieldZone } from './OpponentModel';

export type OffenseCall = { deckName: string; playLabel: string };
export type DefenseCall = { label: string };

export interface PersonalityConfig {
  aggressiveness_offense: number;
  aggressiveness_defense: number;
  trick_play_rate: number;
  blitz_rate_base: number;
  deception_bias: number;
  tempo_preference: 'normal'|'hurry'|'chew';
  risk_tolerance_late: number;
}

export interface PlayCallerDeps {
  charts: OffenseCharts;
  getOffenseHand(): Array<{ id: string; label: string; type: 'run'|'pass'|'punt'|'field-goal' }>;
  getDefenseOptions(): string[];
  getWhiteSignRestriction(playLabel: string): number | null;
}

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }

function isLegal(playLabel: string, deps: PlayCallerDeps, st: GameState, playerIsHome: boolean): boolean {
  const r = deps.getWhiteSignRestriction(playLabel);
  if (r == null) return true;
  const offenseIsHome = (st.possession === 'player') === playerIsHome;
  const yardsToOpp = offenseIsHome ? (100 - st.ballOn) : st.ballOn;
  return yardsToOpp > r;
}

function softmaxPick<T>(rng: RNG, items: Array<{ item: T; util: number }>, temp: number): T {
  const T = Math.max(0.05, temp);
  const weights = items.map(it => Math.exp(clamp(it.util, -1, 1) / T));
  const sum = weights.reduce((s, x) => s + x, 0) || 1;
  const r = rng() * sum;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const w = weights[i] || 0;
    if (r >= acc && r < acc + w) return items[i]!.item;
    acc += w;
  }
  return items[items.length - 1]!.item;
}

function yardlineText(st: GameState, offenseIsHome: boolean): string {
  const abs = st.ballOn;
  if (offenseIsHome) {
    if (abs <= 50) return `OWN ${Math.max(1, abs)}`;
    return `OPP ${Math.max(1, 100 - abs)}`;
  } else {
    if (abs >= 50) return `OWN ${Math.max(1, 100 - abs)}`;
    return `OPP ${Math.max(1, abs)}`;
  }
}

export class PlayCaller {
  private rng: RNG = Math.random;
  private model = new OpponentModel({ halfLife: 12, alpha: 0.5 });
  private lastOffenseCalls: string[] = [];
  private lastDefenseCalls: string[] = [];
  private personality: PersonalityConfig = {
    aggressiveness_offense: 0.5,
    aggressiveness_defense: 0.5,
    trick_play_rate: 0.02,
    blitz_rate_base: 0.18,
    deception_bias: 0.25,
    tempo_preference: 'normal',
    risk_tolerance_late: 0.6,
  };

  constructor(private deps: PlayCallerDeps, private playerIsHome: boolean) {}

  async loadPersonality(cfg?: Partial<PersonalityConfig>): Promise<void> {
    try {
      // Attempt to load JSON config if available at runtime path (bundlers may inline or fail gracefully)
      let fromFile: Partial<PersonalityConfig> = {};
      try {
        const mod: any = await import('./playcaller.config.json').catch(() => null);
        fromFile = (mod && (mod.default || mod)) || {};
      } catch {}
      this.personality = { ...this.personality, ...fromFile } as PersonalityConfig;
    } catch {}
    if (cfg) this.personality = { ...this.personality, ...cfg } as PersonalityConfig;
  }

  reset(seed: number): void {
    this.rng = createLCG(seed);
    this.model.reset();
    this.lastOffenseCalls = [];
    this.lastDefenseCalls = [];
  }

  stepDecay(): void {
    this.model.stepDecay();
  }

  add_observation(pre: GameState, offenseLabel: string, defenseLabel: string): void {
    const offenseIsHome = (pre.possession === 'player') === this.playerIsHome;
    const key = this.model.buildKeyFromState(pre, offenseIsHome);
    this.model.recordOffense(key, categorizeOffenseLabel(offenseLabel));
    this.model.recordDefense(key, categorizeDefenseLabel(defenseLabel));
  }

  choose_offense_play(state: GameState, deckName: string): OffenseCall {
    const hand = this.deps.getOffenseHand().filter(c => (c.type === 'run' || c.type === 'pass') && isLegal(c.label, this.deps, state, this.playerIsHome));
    const offenseIsHome = (state.possession === 'player') === this.playerIsHome;
    const key = this.model.buildKeyFromState(state, offenseIsHome);
    const predDef = this.model.predictDefense(key);
    const phase = toClockPhase(state.quarter, state.clock);
    const fieldZone = toFieldZone(state.ballOn, offenseIsHome);

    // Temperature schedule
    const critical = (state.down === 3 && state.toGo >= 6) || state.down === 4 || (state.quarter === 4 && state.clock <= 6 * 60);
    const baseT = this.personality.tempo_preference === 'hurry' ? 0.7 : this.personality.tempo_preference === 'chew' ? 0.5 : 0.6;
    const temp = clamp(baseT * (critical ? 0.6 : 1.0), 0.2, 1.2);
    const epsilon = 0.03;

    const candidates = hand.map(card => {
      const cat = categorizeOffenseLabel(card.label);
      // Matchup score crude matrix vs predicted defense buckets
      const d = predDef.probs;
      let matchup = 0;
      if (cat === 'run_mid') matchup = (+0.2)*(d.passing + d.prevent + d.prevent_deep) + (-0.3)*(d.goal_line + d.short_yd + d.inside_blitz);
      else if (cat === 'run_edge') matchup = (+0.15)*(d.passing + d.balanced) + (-0.25)*(d.short_yd + d.outside_blitz);
      else if (cat === 'pass_short') matchup = (+0.25)*(d.balanced + d.passing) + (-0.25)*(d.inside_blitz + d.outside_blitz + d.goal_line);
      else if (cat === 'pass_deep') matchup = (+0.35)*d.passing + (-0.5)*(d.prevent + d.prevent_deep);
      else if (cat === 'gadget') matchup = (+0.15)*(1 - d.short_yd) + (-0.2)*d.goal_line;

      // Context score: field position and down-distance
      let context = 0;
      const short = state.toGo <= 2;
      const long = state.toGo >= 8;
      if (short && (cat === 'run_mid' || cat === 'run_edge' || /keeper|slant|off tackle/i.test(card.label))) context += 0.25;
      if (long && (cat === 'pass_short' || cat === 'pass_deep')) context += 0.2;
      if (fieldZone === 'own_gl' || fieldZone === 'backed') {
        if (cat === 'pass_deep' || cat === 'gadget') context -= 0.3;
      }
      if (fieldZone === 'red' && state.down === 1 && cat === 'run_mid') context += 0.05; // diversify but keep base viable

      // Anti-repeat penalty
      const recentRepeats = this.lastOffenseCalls.slice(-2).filter(x => x === card.label).length;
      const antiRepeat = recentRepeats >= 2 ? -0.5 : (recentRepeats === 1 ? -0.2 : 0);

      // Deception: if model is confident (low uncertainty), small boost to off-tendency picks
      const surprise = (1 - predDef.uncertainty) * this.personality.deception_bias * (Math.random() < 0.5 ? 1 : -1) * 0.1;

      // Risk penalty for deep/gadget when leading late
      const offScore = state.score[(state.possession === 'player') ? 'player' : 'ai'];
      const defScore = state.score[(state.possession === 'player') ? 'ai' : 'player'];
      const leadingLate = (state.quarter === 4 && state.clock <= 5 * 60 && offScore > defScore);
      const riskPenalty = leadingLate && (cat === 'pass_deep' || cat === 'gadget') ? 0.25 : 0;

      const w_matchup = 0.45;
      const w_context = 0.30;
      const w_var = 0.15;
      const w_deception = 0.10;
      const w_risk = 0.40;
      const util = clamp(w_matchup*matchup + w_context*context + w_var*antiRepeat + w_deception*surprise - w_risk*riskPenalty, -1, 1);
      return { item: { deckName, playLabel: card.label }, util } as { item: OffenseCall; util: number };
    });

    let chosen: OffenseCall;
    if (this.rng() < epsilon) {
      const idx = Math.floor(this.rng() * Math.max(1, candidates.length));
      chosen = candidates[Math.min(idx, candidates.length - 1)]!.item;
    } else {
      chosen = softmaxPick(this.rng, candidates, temp);
    }

    // Keep short memory for anti-repeat
    this.lastOffenseCalls.push(chosen.playLabel);
    if (this.lastOffenseCalls.length > 8) this.lastOffenseCalls.shift();

    // Telemetry (dev mode only)
    try {
      const isDev = (() => {
        try { if (typeof localStorage !== 'undefined') return localStorage.getItem('gs_dev_mode') === '1'; } catch {}
        try { return !!(globalThis as any).GS?.__devMode?.enabled; } catch {}
        return false;
      })();
      if (isDev) {
        const offenseIsHome2 = (state.possession === 'player') === this.playerIsHome;
        const telem = {
          drive: undefined,
          quarter: state.quarter,
          clock: `${String(Math.floor(state.clock/60)).padStart(1,'0')}:${String(state.clock%60).padStart(2,'0')}`,
          score: { us: state.score[(state.possession==='player')?'player':'ai'], them: state.score[(state.possession==='player')?'ai':'player'] },
          down: state.down, to_go: state.toGo, yardline: yardlineText(state, offenseIsHome2),
          phase,
          field_zone: fieldZone,
          opponent_pred: predDef.probs,
          uncertainty: predDef.uncertainty,
          candidates: candidates.map(c => ({ call: c.item.playLabel, utility: Number(c.util.toFixed(3)) })),
          temp, epsilon,
          chosen: chosen.playLabel,
          personality: {
            agg_off: this.personality.aggressiveness_offense,
            deception: this.personality.deception_bias,
            trick_rate: this.personality.trick_play_rate,
          },
        } as const;
        (globalThis as any).GS?.bus?.emit?.('qa:debug', { text: JSON.stringify(telem) });
      }
    } catch {}

    return chosen;
  }

  choose_defense_play(state: GameState): DefenseCall {
    const options = this.deps.getDefenseOptions();
    const offenseIsHome = (state.possession === 'player') === this.playerIsHome;
    const key = this.model.buildKeyFromState(state, offenseIsHome);
    const predOff = this.model.predictOffense(key);
    const phase = toClockPhase(state.quarter, state.clock);
    const fieldZone = toFieldZone(state.ballOn, offenseIsHome);

    // Build utilities
    const candidates = options.map(label => {
      const cat = categorizeDefenseLabel(label);
      const o = predOff.probs;
      let matchup = 0;
      if (cat === 'goal_line' || cat === 'short_yd') matchup = (+0.35)*(o.run_mid + o.run_edge) + (-0.25)*o.pass_deep;
      else if (cat === 'inside_blitz' || cat === 'outside_blitz') matchup = (+0.25)*(o.pass_short) + (-0.25)*o.gadget;
      else if (cat === 'passing') matchup = (+0.35)*(o.pass_short + o.pass_deep) + (-0.2)*(o.run_mid);
      else if (cat === 'prevent_deep') matchup = (+0.5)*o.pass_deep + (-0.35)*(o.run_mid + o.run_edge);
      else if (cat === 'prevent') matchup = (+0.35)*o.pass_deep + (-0.2)*o.run_mid;
      else matchup = (+0.2)*(o.run_mid + o.run_edge + o.pass_short) - 0.05*o.gadget;

      let context = 0;
      const short = state.toGo <= 2;
      if (short && (cat === 'goal_line' || cat === 'short_yd' || cat === 'inside_blitz')) context += 0.2;
      if (fieldZone === 'red' && (cat === 'goal_line' || cat === 'short_yd')) context += 0.1;
      if (state.quarter === 4 && state.clock <= 2*60 && cat === 'prevent_deep') context += 0.25;

      const recentRepeats = this.lastDefenseCalls.slice(-2).filter(x => x === label).length;
      const antiRepeat = recentRepeats >= 2 ? -0.4 : (recentRepeats === 1 ? -0.15 : 0);

      const util = clamp(0.6*matchup + 0.3*context + 0.1*antiRepeat, -1, 1);
      return { item: { label }, util } as { item: DefenseCall; util: number };
    });

    const critical = (state.down === 3 && state.toGo >= 8) || (state.quarter === 4 && state.clock <= 120);
    const temp = critical ? 0.45 : 0.65;
    const epsilon = 0.02 + 0.1*predOff.uncertainty; // widen when uncertain

    let chosen: DefenseCall;
    if (this.rng() < epsilon) {
      const idx = Math.floor(this.rng() * Math.max(1, candidates.length));
      chosen = candidates[Math.min(idx, candidates.length - 1)]!.item;
    } else {
      chosen = softmaxPick(this.rng, candidates, temp);
    }

    this.lastDefenseCalls.push(chosen.label);
    if (this.lastDefenseCalls.length > 8) this.lastDefenseCalls.shift();

    try {
      const isDev = (() => {
        try { if (typeof localStorage !== 'undefined') return localStorage.getItem('gs_dev_mode') === '1'; } catch {}
        try { return !!(globalThis as any).GS?.__devMode?.enabled; } catch {}
        return false;
      })();
      if (isDev) {
        const offenseIsHome2 = (state.possession === 'player') === this.playerIsHome;
        const telem = {
          quarter: state.quarter,
          clock: `${String(Math.floor(state.clock/60)).padStart(1,'0')}:${String(state.clock%60).padStart(2,'0')}`,
          score: { us: state.score[(state.possession==='player')?'player':'ai'], them: state.score[(state.possession==='player')?'ai':'player'] },
          down: state.down, to_go: state.toGo, yardline: yardlineText(state, offenseIsHome2),
          phase,
          field_zone: fieldZone,
          opponent_pred: predOff.probs,
          uncertainty: predOff.uncertainty,
          candidates: candidates.map(c => ({ call: c.item.label, utility: Number(c.util.toFixed(3)) })),
          temp, epsilon,
          chosen: chosen.label,
          personality: { agg_def: this.personality.aggressiveness_defense },
        } as const;
        (globalThis as any).GS?.bus?.emit?.('qa:debug', { text: JSON.stringify(telem) });
      }
    } catch {}

    return chosen;
  }
}


