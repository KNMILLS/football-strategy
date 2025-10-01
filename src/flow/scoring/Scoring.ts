import type { GameState, TeamSide } from '../../domain/GameState';
import type { FlowEvent } from '../types';

export function resolvePATAndRestart(
  state: GameState,
  side: TeamSide,
  deps: {
    rng: () => number;
    choosePAT?: (ctx: { diff: number; quarter: number; clock: number; side: 'player'|'ai' }) => 'kick'|'two';
    chooseKickoffType?: (ctx: { trailing: boolean; quarter: number; clock: number }) => 'normal'|'onside';
    attemptPatInternal: (rng: () => number) => boolean;
    scoringSideToDelta: (side: TeamSide, points: number) => { playerDelta: number; aiDelta: number };
    isTrailing: (side: TeamSide, score: GameState['score']) => boolean;
    performKickoff: (state: GameState, type: 'normal'|'onside', kicking: TeamSide) => { state: GameState; events: FlowEvent[] };
  }
): { state: GameState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  let next = { ...state } as GameState & { openingKickTo?: TeamSide };
  const diff = next.score.player - next.score.ai;
  const decision = deps.choosePAT?.({ diff, quarter: next.quarter, clock: next.clock, side })
    ?? (side === 'ai' ? (((): 'kick'|'two' => { const late = next.quarter === 4 && next.clock <= 5 * 60; if (diff < 0 && -diff <= 2 && late) return 'two'; return 'kick'; })()) : 'kick');
  if (decision === 'two') {
    const success = deps.rng() < 0.5;
    if (success) {
      if (side === 'player') next.score.player += 2; else next.score.ai += 2;
      events.push({ type: 'score', payload: { ...deps.scoringSideToDelta(side, 2), kind: 'TwoPoint' } });
    }
  } else {
    const good = deps.attemptPatInternal(deps.rng);
    if (good) {
      if (side === 'player') next.score.player += 1; else next.score.ai += 1;
      events.push({ type: 'score', payload: { ...deps.scoringSideToDelta(side, 1), kind: 'XP' } });
    }
  }
  next.awaitingPAT = false;
  const koType = deps.chooseKickoffType?.({ trailing: deps.isTrailing(side, next.score), quarter: next.quarter, clock: next.clock }) ?? 'normal';
  const ko = deps.performKickoff(next, koType, side);
  return { state: ko.state, events: [...events, ...ko.events] };
}

export function attemptFieldGoal(
  state: GameState,
  attemptYards: number,
  side: TeamSide,
  deps: {
    rng: () => number;
    attemptFieldGoalKick: (rng: () => number, attemptYards: number) => boolean;
    scoringSideToDelta: (side: TeamSide, points: number) => { playerDelta: number; aiDelta: number };
    randomHash: () => 'left hash'|'right hash'|'middle';
    formatClock: (n: number) => string;
    formatTeamYardLine: (possessing: TeamSide, ballOn: number) => string;
    performKickoff: (state: GameState, type: 'normal'|'onside', kicking: TeamSide) => { state: GameState; events: FlowEvent[] };
    hudPayload: (s: GameState) => any;
    timeKeepingFieldGoalSeconds: number;
    missedFieldGoalSpot: (args: { ballOn: number; possessing: TeamSide }, attemptYards: number) => { possession: TeamSide; ballOn: number };
  }
): { state: GameState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  let next = { ...state } as GameState & { openingKickTo?: TeamSide };
  const pre = { ...next };
  let timeOff = deps.timeKeepingFieldGoalSeconds;
  let crossedTwoMinute = false;
  if ((pre.quarter === 2 || pre.quarter === 4) && pre.clock > 120 && pre.clock - timeOff < 120) {
    timeOff = pre.clock - 120;
    crossedTwoMinute = true;
  }
  next.clock = Math.max(0, pre.clock - timeOff);
  if (crossedTwoMinute) {
    events.push({ type: 'log', message: 'Brad: Two-minute warning.' });
    events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
  }
  const good = deps.attemptFieldGoalKick(deps.rng, attemptYards);
  if (good) {
    if (side === 'player') next.score.player += 3; else next.score.ai += 3;
    events.push({ type: 'score', payload: { ...deps.scoringSideToDelta(side, 3), kind: 'FG' } });
    const hash = deps.randomHash();
    const brad = `Field goal from ${attemptYards}, ${hash} — it is good. HOME ${next.score.player} — AWAY ${next.score.ai}, Q${next.quarter} ${deps.formatClock(next.clock)}`;
    const rob = 'Clean snap, clean hold; good rotation on the ball.';
    events.push({ type: 'log', message: `Brad: ${brad}` });
    events.push({ type: 'log', message: `Rob: ${rob}` });
    const ko = deps.performKickoff(next, 'normal', side);
    next = ko.state as any;
    events.push(...ko.events);
  } else {
    const miss = deps.missedFieldGoalSpot({ ballOn: next.ballOn, possessing: side }, attemptYards);
    next.possession = miss.possession as TeamSide;
    next.ballOn = miss.ballOn;
    const dd = { down: 1, toGo: 10 } as const;
    next.down = dd.down; next.toGo = dd.toGo;
    const spotEnd = deps.formatTeamYardLine(next.possession, next.ballOn);
    const hash = deps.randomHash();
    const brad = `Field goal from ${attemptYards}, ${hash} — no good. ${next.possession === 'player' ? 'HOME' : 'AWAY'} ball at ${spotEnd}.`;
    const rob = 'Snap and hold were fine — just yanked it.';
    events.push({ type: 'log', message: `Brad: ${brad}` });
    events.push({ type: 'log', message: `Rob: ${rob}` });
  }
  events.push({ type: 'hud', payload: deps.hudPayload(next) });
  return { state: next, events };
}


