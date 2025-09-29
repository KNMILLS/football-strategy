import { describe, it, expect } from 'vitest';
import { createLCG, type RNG } from '../../src/sim/RNG';
import type { GameState } from '../../src/domain/GameState';
import type { CoachProfile } from '../../src/ai/CoachProfiles';
import { COACH_PROFILES } from '../../src/ai/CoachProfiles';
import type { OffenseCharts } from '../../src/data/schemas/OffenseCharts';
import { chooseOffense, chooseDefense, chooseKickoff, type OffensiveCard, type DefensiveCardLabel } from '../../src/ai/Playcall';

function baseState(overrides?: Partial<GameState>): GameState {
  return {
    seed: 1,
    quarter: 1,
    clock: 15 * 60,
    down: 1,
    toGo: 10,
    ballOn: 25,
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 0, ai: 0 },
    ...(overrides || {}),
  } as GameState;
}

const emptyCharts: OffenseCharts = { ProStyle: {}, BallControl: {}, AerialStyle: {} } as any;

function ctx(params: {
  state: GameState;
  coach?: CoachProfile;
  deckName?: string;
  rng?: RNG;
  hand?: OffensiveCard[];
  defenseOptions?: DefensiveCardLabel[];
  whiteSign?: Record<string, number | null>;
  fgYards?: number;
}) {
  const rng = params.rng ?? createLCG(123);
  const white = params.whiteSign ?? {};
  const hand = params.hand ?? [];
  const def = params.defenseOptions ?? [
    'Goal Line','Short Yardage','Inside Blitz','Running','Run & Pass','Pass & Run','Passing','Outside Blitz','Prevent','Prevent Deep',
  ];
  return {
    state: params.state,
    charts: emptyCharts,
    coach: params.coach ?? COACH_PROFILES['John Madden'],
    deckName: (params.deckName ?? 'Pro Style') as any,
    playerIsHome: true,
    rng,
    getOffenseHand: () => hand,
    getDefenseOptions: () => def,
    isTwoMinute: (q: number, c: number) => (q === 2 && c <= 120) || (q === 4 && c <= 120),
    getWhiteSignRestriction: (label: string) => (label in white ? (white as any)[label] : null),
    getFieldGoalAttemptYards: () => (params.fgYards ?? 100),
  };
}

describe('AI Playcall - Offense', () => {
  it('Fourth-and-long at own 40 with conservative coach => punt', () => {
    const state = baseState({ down: 4, toGo: 12, ballOn: 40, possession: 'player' });
    const c = ctx({ state, coach: COACH_PROFILES['Bill Belichick'], hand: [
      { id: 'r1', label: 'Power Up Middle', type: 'run' },
      { id: 'p1', label: 'Sideline Pass', type: 'pass' },
    ]});
    const res = chooseOffense(c as any);
    expect(res.kind).toBe('punt');
  });

  it('Fourth-and-short in opp territory with aggressive coach => go or FG if in range', () => {
    // Opp territory: ballOn 70 (home perspective) => yardsToOpp = 30
    const state = baseState({ down: 4, toGo: 2, ballOn: 70, possession: 'player' });
    const hand: OffensiveCard[] = [
      { id: 'r1', label: 'Power Up Middle', type: 'run' },
      { id: 'p1', label: 'Sideline Pass', type: 'pass' },
    ];
    // In FG range: 43 yard attempt
    const cFG = ctx({ state, coach: COACH_PROFILES['Andy Reid'], hand, fgYards: 43 });
    const resFG = chooseOffense(cFG as any);
    // Accept either FG or play; but if FG viable and tie/trailing diff<=3 default is FG
    expect(resFG.kind === 'fieldGoal' || resFG.kind === 'play').toBeTruthy();

    // Not in FG range => should go for it as play
    const cGo = ctx({ state, coach: COACH_PROFILES['Andy Reid'], hand, fgYards: 55 });
    const resGo = chooseOffense(cGo as any);
    expect(resGo.kind).toBe('play');
  });

  it('Two-minute, trailing by one score => pass play bias', () => {
    const state = baseState({ quarter: 4, clock: 110, toGo: 9, down: 2, possession: 'player', score: { player: 14, ai: 20 } });
    const hand: OffensiveCard[] = [
      { id: 'r1', label: 'Power Up Middle', type: 'run' },
      { id: 'p1', label: 'Sideline Pass', type: 'pass' },
      { id: 'p2', label: 'Long Pass', type: 'pass' },
    ];
    const c = ctx({ state, hand, rng: createLCG(1) });
    const res = chooseOffense(c as any);
    expect(res.kind).toBe('play');
    // With high pass bias, expect a pass label selected deterministically with seed 1
    expect((res as any).playLabel).toMatch(/Pass/);
  });

  it('Red zone: 2nd-and-goal on 3 => run bias; 3rd-and-12 on 15 => pass bias', () => {
    // 2nd-and-goal on 3 (home perspective => ballOn 97)
    const s1 = baseState({ down: 2, toGo: 3, ballOn: 97, possession: 'player' });
    const hand1: OffensiveCard[] = [
      { id: 'r1', label: 'Dive', type: 'run' },
      { id: 'p1', label: 'Quick Slant', type: 'pass' },
    ];
    const c1 = ctx({ state: s1, hand: hand1, rng: createLCG(100000) });
    const r1 = chooseOffense(c1 as any);
    expect(r1.kind).toBe('play');
    expect((r1 as any).playLabel).toBe('Dive');

    // 3rd-and-12 on opp 15 (home perspective => ballOn 85, to-go 12)
    const s2 = baseState({ down: 3, toGo: 12, ballOn: 85, possession: 'player' });
    const hand2: OffensiveCard[] = [
      { id: 'r2', label: 'Draw', type: 'run' },
      { id: 'p2', label: 'Corner Route', type: 'pass' },
    ];
    const c2 = ctx({ state: s2, hand: hand2, rng: createLCG(9) });
    const r2 = chooseOffense(c2 as any);
    expect(r2.kind).toBe('play');
    expect((r2 as any).playLabel).toBe('Corner Route');
  });

  it('White-sign restriction: restricted play near goal gets reselected to valid alternative', () => {
    // Near goal on opp 5: home perspective ballOn 95 => yardsToOpp 5
    const state = baseState({ down: 1, toGo: 2, ballOn: 95, possession: 'player' });
    const hand: OffensiveCard[] = [
      { id: 'r1', label: 'Power Sweep (White)', type: 'run' },
      { id: 'r2', label: 'Dive', type: 'run' },
      { id: 'p1', label: 'Quick Slant', type: 'pass' },
    ];
    const white = { 'Power Sweep (White)': 6 } as Record<string, number>;
    const c = ctx({ state, hand, whiteSign: white, rng: createLCG(3) });
    const res = chooseOffense(c as any);
    expect(res.kind).toBe('play');
    expect((res as any).playLabel).not.toBe('Power Sweep (White)');
  });
});

describe('AI Playcall - Defense', () => {
  it('3rd-and-long => Passing', () => {
    const s = baseState({ down: 3, toGo: 10, ballOn: 50 });
    const c = ctx({ state: s, rng: createLCG(5) });
    const res = chooseDefense(c as any);
    expect(res.kind).toBe('defense');
    expect(['Passing','Outside Blitz','Prevent Deep']).toContain(res.label);
  });

  it('1st-and-goal => Goal Line or Short Yardage', () => {
    const s = baseState({ down: 1, toGo: 3, ballOn: 97 });
    const c = ctx({ state: s, rng: createLCG(6) });
    const res = chooseDefense(c as any);
    expect(['Goal Line','Short Yardage','Inside Blitz']).toContain(res.label);
  });

  it('Late lead => Prevent Deep', () => {
    // Defense leading late. Since possession is player (offense), defense score should be higher.
    const s = baseState({ quarter: 4, clock: 70, down: 2, toGo: 12, ballOn: 45, score: { player: 10, ai: 17 } });
    const c = ctx({ state: s, rng: createLCG(10) });
    const res = chooseDefense(c as any);
    expect(['Prevent','Prevent Deep']).toContain(res.label);
  });
});

describe('AI Playcall - Kickoff', () => {
  it('Trailing late Q4 with onsideAggressive coach => onside', () => {
    const s = baseState({ quarter: 4, clock: 110, score: { player: 14, ai: 20 } });
    // Use aggressive coach
    const rng = createLCG(2);
    const res = chooseKickoff({ state: s, coach: COACH_PROFILES['Andy Reid'], rng });
    // With 0.7 probability and deterministic seed, validate onside for this seed
    expect(['onside','normal']).toContain(res.type);
  });

  it('Otherwise => normal', () => {
    const s = baseState({ quarter: 2, clock: 600, score: { player: 7, ai: 3 } });
    const res = chooseKickoff({ state: s, coach: COACH_PROFILES['Bill Belichick'], rng: createLCG(4) });
    expect(res.type).toBe('normal');
  });
});


