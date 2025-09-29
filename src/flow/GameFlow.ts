import type { GameState, TeamSide } from '../domain/GameState';
import type { RNG } from '../sim/RNG';
import type { OffenseCharts } from '../data/schemas/OffenseCharts';
import { resolvePlayCore } from '../rules/ResolvePlayCore';
import { administerPenalty, type AdminResult } from '../rules/PenaltyAdmin';
import type { Outcome } from '../rules/ResultParsing';
import { DEFAULT_TIME_KEEPING } from '../rules/ResultParsing';
import { timeOffWithTwoMinute } from '../rules/Timekeeping';
import { resolveKickoff } from '../rules/special/Kickoff';
import { attemptFieldGoal as attemptFieldGoalKick, PLACE_KICK_TABLE, rollD6 as rollD6PK } from '../rules/special/PlaceKicking';
import { missedFieldGoalSpot } from '../rules/Spots';

export type FlowEvent =
  | { type: 'hud'; payload: any }
  | { type: 'log'; message: string }
  | { type: 'vfx'; payload: { kind: string; data?: any } }
  | { type: 'choice-required'; choice: 'puntReturn'|'safetyFreeKick'|'onsideOrNormal'|'penaltyAcceptDecline'|'patChoice'; data: any }
  | { type: 'score'; payload: { playerDelta: number; aiDelta: number; kind: 'TD'|'FG'|'Safety'|'XP'|'TwoPoint' } }
  | { type: 'kickoff'; payload: { onside: boolean } }
  | { type: 'endOfQuarter'; payload: { quarter: number } }
  | { type: 'halftime' }
  | { type: 'final'; payload: { score: GameState['score'] } }
  | { type: 'untimedDownScheduled' };

export interface FlowContext {
  charts: OffenseCharts;
  rng: RNG;
  policy?: {
    choosePAT?(ctx: { diff: number; quarter: number; clock: number; side: 'player'|'ai' }): 'kick'|'two';
    chooseSafetyFreeKick?(ctx: { leading: boolean }): 'kickoff+25'|'puntFrom20';
    chooseKickoffType?(ctx: { trailing: boolean; quarter: number; clock: number }): 'normal'|'onside';
  };
}

export interface PlayInput {
  deckName: string;
  playLabel: string;
  defenseLabel: string;
}

function isTwoMinute(quarter: number, clock: number): boolean {
  return (quarter === 2 || quarter === 4) && clock <= 120;
}

function clampYard(abs: number): number {
  return Math.max(0, Math.min(100, abs));
}

function nextDownDistanceAfterKickoff(prev: GameState): Pick<GameState, 'down'|'toGo'> {
  return { down: 1, toGo: 10 } as const;
}

function scoringSideToDelta(side: TeamSide, points: number): { playerDelta: number; aiDelta: number } {
  return side === 'player' ? { playerDelta: points, aiDelta: 0 } : { playerDelta: 0, aiDelta: points };
}

function attemptPatInternal(rng: RNG): boolean {
  // 2D6 using place kicking table's PAT column
  const roll = rollD6PK(rng) + rollD6PK(rng);
  const row = PLACE_KICK_TABLE[roll] || {} as any;
  return row.PAT === 'G';
}

export class GameFlow {
  constructor(private ctx: FlowContext) {}

  resolveSnap(state: GameState, input: PlayInput): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];

    // Respect untimed down scheduling: if present, do not advance time this snap
    const hadUntimed = Boolean((state as any).untimedDownScheduled);

    const pre = { ...state };
    const res = resolvePlayCore({ state: pre, charts: this.ctx.charts, deckName: input.deckName, playLabel: input.playLabel, defenseLabel: input.defenseLabel, rng: this.ctx.rng });

    // Penalty handling: branch to accept/decline flow
    if ((res as any).outcome && (res as any).outcome.category === 'penalty' && (res as any).outcome.penalty) {
      const outcome: any = (res as any).outcome;
      const admin: AdminResult = administerPenalty({
        prePlayState: pre,
        postPlayState: pre,
        offenseGainedYards: 0,
        outcome,
        inTwoMinute: isTwoMinute(pre.quarter, pre.clock),
        wasFirstDownOnPlay: false,
      });
      const pen = outcome.penalty as { on: 'offense'|'defense'; yards: number; firstDown?: boolean };
      const decidingSide: TeamSide = pen.on === 'defense' ? pre.possession : (pre.possession === 'player' ? 'ai' : 'player');
      // If AI decides, pick immediately using hint (default accept on tie)
      if (decidingSide === 'ai') {
        const decision: 'accept'|'decline' = admin.decisionHint === 'decline' ? 'decline' : 'accept';
        const fin = this.finalizePenaltyDecision(decision === 'accept' ? admin.accepted : admin.declined, decision, admin.adminMeta);
        const nextState = fin.state as GameState & { openingKickTo?: TeamSide; untimedDownScheduled?: boolean };
        events.push(...fin.events);
        events.push({ type: 'hud', payload: this.hudPayload(nextState) });
        return { state: nextState, events };
      }
      // Human decides: emit choice-required and hold state
      const payload = {
        side: 'player' as const,
        summary: { down: pre.down, toGo: pre.toGo, ballOn: pre.ballOn, quarter: pre.quarter, clock: pre.clock, possession: pre.possession },
        prePlay: { down: pre.down, toGo: pre.toGo, ballOn: pre.ballOn },
        accepted: { down: admin.accepted.down, toGo: admin.accepted.toGo, ballOn: admin.accepted.ballOn },
        declined: { down: admin.declined.down, toGo: admin.declined.toGo, ballOn: admin.declined.ballOn },
        penalty: { on: pen.on, yards: pen.yards, firstDown: pen.firstDown },
        meta: {
          halfDistanceCapped: admin.adminMeta.halfDistanceCapped,
          measuredFromMidfieldForLG: admin.adminMeta.measuredFromMidfieldForLG,
          spotBasis: admin.adminMeta.spotBasis,
          untimedDownScheduled: admin.adminMeta.untimedDownScheduled,
        },
      };
      events.push({ type: 'choice-required', choice: 'penaltyAcceptDecline', data: payload });
      // Do not advance time; return pre state with HUD unchanged
      events.push({ type: 'hud', payload: this.hudPayload(pre) });
      return { state: pre, events };
    }

    let next = { ...res.state } as GameState & { openingKickTo?: TeamSide; untimedDownScheduled?: boolean };

    // Compute time off with two-minute rules unless untimed down applies
    const inTwoBefore = isTwoMinute(pre.quarter, pre.clock);
    let timeOff = 0;
    let crossedTwoMinute = false;
    if (!hadUntimed) {
      const wasFirstDown = !res.possessionChanged && (res.outcome && res.outcome.category === 'gain' && (res.outcome.yards || 0) > 0 && (res.outcome.yards || 0) >= pre.toGo);
      timeOff = timeOffWithTwoMinute(res.outcome as Outcome, inTwoBefore, wasFirstDown);
      if ((pre.quarter === 2 || pre.quarter === 4) && pre.clock > 120 && pre.clock - timeOff < 120) {
        timeOff = pre.clock - 120;
        crossedTwoMinute = true;
      }
    }
    next.clock = Math.max(0, pre.clock - timeOff);

    if (crossedTwoMinute) {
      events.push({ type: 'log', message: 'Two-minute warning.' });
      events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
    }

    // Handle scoring sequences
    if (res.touchdown) {
      // 6 already added in rules
      next.awaitingPAT = true;
      const side: TeamSide = pre.possession;
      events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 6), kind: 'TD' } });
      events.push({ type: 'vfx', payload: { kind: 'td' } });
      const pat = this.resolvePATAndRestart(next, side);
      next = pat.state as any;
      events.push(...pat.events);
    } else if (res.safety) {
      // Points already in state by rules; award event
      const conceding: TeamSide = pre.possession;
      const scoringSide: TeamSide = conceding === 'player' ? 'ai' : 'player';
      events.push({ type: 'score', payload: { ...scoringSideToDelta(scoringSide, 2), kind: 'Safety' } });
      const safetyRes = this.resolveSafetyRestart(next, conceding);
      next = safetyRes.state as any;
      events.push(...safetyRes.events);
    }

    // Period transitions if not just kicked off due to scoring (kickoff logic will set down/toGo and time separately)
    if (!next.gameOver && !next.awaitingPAT) {
      const untimedNow = Boolean(next.untimedDownScheduled);
      if (next.clock === 0 && !untimedNow) {
        const endedQuarter = next.quarter;
        events.push({ type: 'endOfQuarter', payload: { quarter: endedQuarter } });
        if (endedQuarter === 2) {
          // Halftime then start Q3 with kickoff
          events.push({ type: 'halftime' });
          next.quarter = 3;
          next.clock = 15 * 60;
          // Second-half kickoff: team that received opening now kicks
          const openingReceiver: TeamSide = (next as any).openingKickTo || 'player';
          const kickTeam: TeamSide = openingReceiver;
          const ko = this.performKickoff(next, 'normal', kickTeam);
          next = ko.state as any;
          events.push(...ko.events);
        } else if (endedQuarter === 4) {
          next.gameOver = true;
          events.push({ type: 'final', payload: { score: next.score } });
        } else {
          // Q1->Q2 or Q3->Q4
          next.quarter = endedQuarter + 1;
          next.clock = 15 * 60;
        }
      }
    }

    events.push({ type: 'hud', payload: this.hudPayload(next) });
    return { state: next, events };
  }

  finalizePenaltyDecision(chosen: GameState, decision: 'accept'|'decline', meta: AdminResult['adminMeta']): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];
    let next = { ...chosen } as GameState & { untimedDownScheduled?: boolean };
    // Narrate decision
    events.push({ type: 'log', message: decision === 'accept' ? 'Penalty accepted.' : 'Penalty declined. The play stands.' });
    if (meta.untimedDownScheduled) {
      (next as any).untimedDownScheduled = true;
      events.push({ type: 'log', message: 'Untimed down will be played due to defensive penalty.' });
    }
    // Period transitions similar to normal flow
    if (!next.gameOver && !next.awaitingPAT) {
      const untimedNow = Boolean((next as any).untimedDownScheduled);
      if (next.clock === 0 && !untimedNow) {
        const endedQuarter = next.quarter;
        events.push({ type: 'endOfQuarter', payload: { quarter: endedQuarter } });
        if (endedQuarter === 2) {
          events.push({ type: 'halftime' });
          next.quarter = 3;
          next.clock = 15 * 60;
          // Kickoff at start of half handled by caller via performKickoff if needed elsewhere
        } else if (endedQuarter === 4) {
          next.gameOver = true;
          events.push({ type: 'final', payload: { score: next.score } });
        } else {
          next.quarter = endedQuarter + 1;
          next.clock = 15 * 60;
        }
      }
    }
    // Always push HUD update for current state
    events.push({ type: 'hud', payload: this.hudPayload(next) });
    return { state: next, events };
  }

  resolvePATAndRestart(state: GameState, side: TeamSide): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];
    let next = { ...state } as GameState & { openingKickTo?: TeamSide };
    const diff = next.score.player - next.score.ai;
    const decision = this.ctx.policy?.choosePAT?.({ diff, quarter: next.quarter, clock: next.clock, side })
      ?? (side === 'ai' ? (this.defaultAIShouldGoForTwo({ diff, quarter: next.quarter, clock: next.clock }) ? 'two' : 'kick') : 'kick');

    if (decision === 'two') {
      const success = this.ctx.rng() < 0.5;
      if (success) {
        if (side === 'player') next.score.player += 2; else next.score.ai += 2;
        events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 2), kind: 'TwoPoint' } });
      }
    } else {
      const good = attemptPatInternal(this.ctx.rng);
      if (good) {
        if (side === 'player') next.score.player += 1; else next.score.ai += 1;
        events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 1), kind: 'XP' } });
      }
    }
    next.awaitingPAT = false;
    // Kickoff by scoring team
    const koType = this.ctx.policy?.chooseKickoffType?.({ trailing: this.isTrailing(side, next.score), quarter: next.quarter, clock: next.clock }) ?? 'normal';
    const ko = this.performKickoff(next, koType, side);
    const out = ko.state as any;
    events.push(...ko.events);
    return { state: out, events };
  }

  attemptFieldGoal(state: GameState, attemptYards: number, side: TeamSide): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];
    let next = { ...state } as GameState & { openingKickTo?: TeamSide };
    // Consume time for FG attempt with two-minute crossing rules
    const pre = { ...next };
    let timeOff = DEFAULT_TIME_KEEPING.fieldgoal;
    let crossedTwoMinute = false;
    if ((pre.quarter === 2 || pre.quarter === 4) && pre.clock > 120 && pre.clock - timeOff < 120) {
      timeOff = pre.clock - 120;
      crossedTwoMinute = true;
    }
    next.clock = Math.max(0, pre.clock - timeOff);
    if (crossedTwoMinute) {
      events.push({ type: 'log', message: 'Two-minute warning.' });
      events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
    }

    const good = attemptFieldGoalKick(this.ctx.rng, attemptYards);
    if (good) {
      if (side === 'player') next.score.player += 3; else next.score.ai += 3;
      events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 3), kind: 'FG' } });
      const ko = this.performKickoff(next, 'normal', side);
      next = ko.state as any;
      events.push(...ko.events);
    } else {
      // Miss: defense takes over per centralized Spots rule
      const miss = missedFieldGoalSpot({ ballOn: next.ballOn, possessing: side }, 
        // attemptYards is already provided; pass through for future variants
        attemptYards);
      next.possession = miss.possession as TeamSide;
      next.ballOn = miss.ballOn;
      const dd = nextDownDistanceAfterKickoff(next);
      next.down = dd.down; next.toGo = dd.toGo;
      events.push({ type: 'log', message: 'Field goal missed. Turnover on downs at spot.' });
    }
    events.push({ type: 'hud', payload: this.hudPayload(next) });
    return { state: next, events };
  }

  resolveSafetyRestart(state: GameState, conceding: TeamSide): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];
    let next = { ...state } as GameState;
    const leading = this.isLeading(conceding === 'player' ? 'ai' : 'player', next.score);
    const choice = this.ctx.policy?.chooseSafetyFreeKick?.({ leading }) ?? 'kickoff+25';
    // After safety, free kick by conceding team
    const kicking: TeamSide = conceding;
    if (choice === 'kickoff+25') {
      // Receiving team takes at +25 from their goal
      const receiver: TeamSide = kicking === 'player' ? 'ai' : 'player';
      const abs = receiver === 'player' ? 25 : 75;
      next.possession = receiver;
      next.ballOn = abs;
      const dd = nextDownDistanceAfterKickoff(next);
      next.down = dd.down; next.toGo = dd.toGo;
      events.push({ type: 'kickoff', payload: { onside: false } });
    } else {
      // Free-kick punt from own 20: model as a punt with fixed ballOn 20
      // Minimalism: place ball to receiving at 35 yard line equivalent
      const receiver: TeamSide = kicking === 'player' ? 'ai' : 'player';
      const abs = receiver === 'player' ? 35 : 65;
      next.possession = receiver;
      next.ballOn = abs;
      const dd = nextDownDistanceAfterKickoff(next);
      next.down = dd.down; next.toGo = dd.toGo;
      events.push({ type: 'kickoff', payload: { onside: false } });
    }
    events.push({ type: 'hud', payload: this.hudPayload(next) });
    return { state: next, events };
  }

  performKickoff(state: GameState, type: 'normal'|'onside', kicking: TeamSide): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];
    let next = { ...state } as GameState;
    // Time for kickoff
    let timeOff = DEFAULT_TIME_KEEPING.kickoff;
    if ((next.quarter === 2 || next.quarter === 4) && next.clock > 120 && next.clock - timeOff < 120) {
      timeOff = next.clock - 120;
      events.push({ type: 'log', message: 'Two-minute warning.' });
      events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
    }
    next.clock = Math.max(0, next.clock - timeOff);

    const onside = type === 'onside';
    const kickerLeadingOrTied = this.isLeading(kicking, next.score) || this.isTied(next.score);
    const ko = resolveKickoff(this.ctx.rng, { onside, kickerLeadingOrTied });
    const receiver: TeamSide = kicking === 'player' ? 'ai' : 'player';
    const absYard = receiver === 'player' ? ko.yardLine : 100 - ko.yardLine;
    // If turnover on kickoff, possession stays with kicker at same absolute spot
    next.possession = ko.turnover ? kicking : receiver;
    next.ballOn = clampYard(absYard);
    const dd = nextDownDistanceAfterKickoff(next);
    next.down = dd.down; next.toGo = dd.toGo;
    events.push({ type: 'kickoff', payload: { onside } });
    events.push({ type: 'hud', payload: this.hudPayload(next) });
    return { state: next, events };
  }

  private hudPayload(s: GameState) {
    return {
      quarter: s.quarter,
      clock: s.clock,
      down: s.down,
      toGo: s.toGo,
      ballOn: s.ballOn,
      possession: s.possession,
      score: { player: s.score.player, ai: s.score.ai },
    };
  }

  private isLeading(side: TeamSide, score: GameState['score']): boolean {
    const diff = score.player - score.ai;
    return (side === 'player' ? diff : -diff) > 0;
    }

  private isTrailing(side: TeamSide, score: GameState['score']): boolean {
    const diff = score.player - score.ai;
    return (side === 'player' ? diff : -diff) < 0;
  }

  private isTied(score: GameState['score']): boolean {
    return score.player === score.ai;
  }

  private defaultAIShouldGoForTwo(ctx: { diff: number; quarter: number; clock: number }): boolean {
    const late = ctx.quarter === 4 && ctx.clock <= 5 * 60;
    // Trailing by 1 or 2 late
    if (ctx.diff < 0 && -ctx.diff <= 2 && late) return true;
    return false;
  }
}


