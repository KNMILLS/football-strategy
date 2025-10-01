import type { GameState, TeamSide } from '../../domain/GameState';
import type { RNG } from '../../sim/RNG';
import type { OffenseCharts } from '../../data/schemas/OffenseCharts';
import { resolvePlayCore } from '../../rules/ResolvePlayCore';
import { administerPenalty, type AdminResult } from '../../rules/PenaltyAdmin';
import type { Outcome } from '../../rules/ResultParsing';
import { DEFAULT_TIME_KEEPING as DEFAULT_TIME_KEEPING_CONST } from '../../rules/ResultParsing';
import type { TimeKeeping } from '../../data/schemas/Timekeeping';
import { buildBroadcastCall as buildBroadcastCallExt, chooseCommentaryLines as chooseCommentaryLinesExt } from '../narration/Broadcast';
import { buildResultSummary as buildResultSummaryExt } from '../narration/Summary';
import { DriveTracker } from '../drive/DriveTracker';
import { performKickoff as performKickoffExt, handleFourthDownPunt } from '../special/SpecialTeamsFlow';
import { resolvePATAndRestart as resolvePATAndRestartExt, attemptFieldGoal as attemptFieldGoalFlow } from '../scoring/Scoring';
import { attemptFieldGoal as attemptFieldGoalKick } from '../../rules/special/PlaceKicking';
import { missedFieldGoalSpot } from '../../rules/Spots';
import { finalizePenaltyDecision as finalizePenaltyDecisionExt } from '../penalties/PenaltyFlow';
import { resolveSafetyRestart as resolveSafetyRestartExt } from '../special/Safety';
import { hudPayload as hudPayloadExt } from '../HudPayload';
import type { FlowEvent, PlayInput, FlowContext } from '../types';
import {
  isTwoMinute,
  clampYard,
  nextDownDistanceAfterKickoff,
  scoringSideToDelta,
  attemptPatInternal,
  randomHash,
  isLeading,
  isTrailing,
  isTied,
  defaultAIShouldGoForTwo
} from '../utils/GameFlowUtils';
import {
  formatOrdinal,
  formatClock,
  formatPossessionSpotForBroadcast,
  formatTeamYardLine,
  scoreAnchorLine
} from '../formatting/GameFlowFormatting';
import {
  calculateTimeOff,
  applyTimeOff,
  determineTempo,
  type TempoContext,
  type TempoStrategy
} from '../time/TimeManagement';

/**
 * Core game flow orchestration logic
 * Main class that coordinates all aspects of game flow including plays, scoring, penalties, and time management
 */
export class GameFlowCore {
  constructor(private ctx: FlowContext) {
    this.tracker = new DriveTracker(this.ctx.rng);
  }

  // Drive/quarter/narration memory encapsulated in tracker
  private tracker: DriveTracker;

  /**
   * Resolves a snap (play) and returns the resulting game state and events
   * This is the main orchestration method that handles play resolution, penalties, scoring, and time management
   * @param state - Current game state
   * @param input - Play input containing deck, play label, and defense
   * @returns Updated game state and generated events
   */
  resolveSnap(state: GameState, input: PlayInput): { state: GameState; events: FlowEvent[] } {
    const events: FlowEvent[] = [];

    // Respect untimed down scheduling: if present, do not advance time this snap
    const hadUntimed = Boolean((state as any).untimedDownScheduled);

    const pre = { ...state };
    const isPuntCard = /punt/i.test(String(input.playLabel));
    const res = resolvePlayCore({ state: pre, charts: this.ctx.charts, deckName: input.deckName, playLabel: input.playLabel, defenseLabel: input.defenseLabel, rng: this.ctx.rng });
    const possessionChanged = (res as any).possessionChanged;

    // Start new drive capsule if possession changed from last snap
    this.beginDriveIfNeeded(pre, events);

    // Penalty handling: branch to accept/decline flow
    if ((res as any).outcome && (res as any).outcome.category === 'penalty' && (res as any).outcome.penalty) {
      return this.handlePenalty(pre, res as any, events);
    }

    let next = { ...res.state } as GameState & { openingKickTo?: TeamSide; untimedDownScheduled?: boolean };

    // Compute time management
    const tempo = this.determineTempoForPlay(pre);
    const timeResult = calculateTimeOff(pre, res.outcome as Outcome, this.ctx.timeKeeping, tempo, hadUntimed, possessionChanged);
    next = applyTimeOff(next, timeResult);

    // Handle two-minute warning
    if (timeResult.crossedTwoMinute) {
      events.push({ type: 'log', message: `Two-minute warning.` });
      events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
    }

    // Narrate play result BEFORE handling follow-up sequences (PAT, kickoff) to keep chronological order
    this.narratePlayResult(pre, next, input, res as any, events, isPuntCard);

    // Update last-note memory for deduplication (zone, FG range, defense) based on pre-snap state
    this.updateLastNotes(pre, input);

    // Handle punts explicitly for narration and field position if punt card was chosen
    if (!next.gameOver && !res.touchdown && !res.safety && isPuntCard && pre.down === 4) {
      const handled = handleFourthDownPunt(pre, next, {
        rng: this.ctx.rng,
        formatTeamYardLine: (p, b) => formatTeamYardLine(p, b),
        endDriveSummaryIfAny: (s, ev, reason) => this.endDriveSummaryIfAny(s, ev, reason),
      });
      return { state: handled.state, events: [...events, ...handled.events] };
    }

    // Handle scoring sequences
    if (res.touchdown) {
      return this.handleTouchdown(pre, next, events);
    } else if (res.safety) {
      return this.handleSafety(pre, next, events);
    }

    // Turnover on downs: if it was 4th down and offense did not achieve a first down
    if (!next.gameOver && !res.touchdown && !res.safety && !possessionChanged) {
      if (this.isTurnoverOnDowns(pre, res.outcome as Outcome)) {
        return this.handleTurnoverOnDowns(pre, next, events);
      }
    }

    // Period transitions if not just kicked off due to scoring (kickoff logic will set down/toGo and time separately)
    if (!next.gameOver && !next.awaitingPAT) {
      if (next.clock === 0 && !Boolean(next.untimedDownScheduled)) {
        return this.handleQuarterTransition(next, events);
      }
    }

    events.push({ type: 'hud', payload: this.hudPayload(next) });
    return { state: next, events };
  }

  /**
   * Finalizes a penalty decision and returns the resulting state and events
   * @param chosen - The chosen game state (accepted or declined penalty)
   * @param decision - Whether penalty was accepted or declined
   * @param meta - Penalty administration metadata
   * @param info - Optional penalty information
   * @returns Updated game state and events
   */
  finalizePenaltyDecision(chosen: GameState, decision: 'accept'|'decline', meta: AdminResult['adminMeta'], info?: { on: 'offense'|'defense'; yards: number }): { state: GameState; events: FlowEvent[] } {
    return finalizePenaltyDecisionExt(chosen, decision, meta, {
      formatOrdinal: (n) => formatOrdinal(n),
      hudPayload: (s) => this.hudPayload(s)
    }, info);
  }

  /**
   * Resolves PAT (Point After Touchdown) and restart logic
   * @param state - Current game state
   * @param side - Team that scored
   * @returns Updated game state and events
   */
  resolvePATAndRestart(state: GameState, side: TeamSide): { state: GameState; events: FlowEvent[] } {
    return resolvePATAndRestartExt(state, side, {
      rng: () => this.ctx.rng?.() || Math.random(),
      attemptPatInternal: (r) => attemptPatInternal(r as any),
      scoringSideToDelta: (s, p) => scoringSideToDelta(s, p),
      isTrailing: (s, score) => isTrailing(s, score),
      performKickoff: (st, type, kicking) => this.performKickoff(st, type, kicking),
      ...(this.ctx.policy?.choosePAT ? { choosePAT: this.ctx.policy.choosePAT.bind(this.ctx.policy) } : {}),
      ...(this.ctx.policy?.chooseKickoffType ? { chooseKickoffType: this.ctx.policy.chooseKickoffType.bind(this.ctx.policy) } : {}),
    });
  }

  /**
   * Attempts a field goal
   * @param state - Current game state
   * @param attemptYards - Distance of field goal attempt
   * @param side - Team attempting the field goal
   * @returns Updated game state and events
   */
  attemptFieldGoal(state: GameState, attemptYards: number, side: TeamSide): { state: GameState; events: FlowEvent[] } {
    return attemptFieldGoalFlow(state, attemptYards, side, {
      rng: () => this.ctx.rng?.() || Math.random(),
      attemptFieldGoalKick: (r, y) => attemptFieldGoalKick(r as any, y),
      scoringSideToDelta: (s, p) => scoringSideToDelta(s, p),
      randomHash: () => randomHash(this.ctx.rng),
      formatClock: (n) => formatClock(n),
      formatTeamYardLine: (p, b) => formatTeamYardLine(p, b),
      performKickoff: (st, type, kicking) => this.performKickoff(st, type, kicking),
      hudPayload: (s) => this.hudPayload(s),
      timeKeepingFieldGoalSeconds: (this.ctx.timeKeeping || DEFAULT_TIME_KEEPING_CONST).fieldgoal,
      missedFieldGoalSpot: (args, y) => missedFieldGoalSpot(args as any, y),
    });
  }

  /**
   * Resolves safety restart after a safety
   * @param state - Current game state
   * @param conceding - Team that conceded the safety
   * @returns Updated game state and events
   */
  resolveSafetyRestart(state: GameState, conceding: TeamSide): { state: GameState; events: FlowEvent[] } {
    return resolveSafetyRestartExt(state, conceding, {
      ...(this.ctx.policy?.chooseSafetyFreeKick ? { chooseSafetyFreeKick: this.ctx.policy.chooseSafetyFreeKick.bind(this.ctx.policy) } : {}),
      isLeading: (s, score) => isLeading(s, score),
    });
  }

  /**
   * Performs a kickoff
   * @param state - Current game state
   * @param type - Type of kickoff (normal or onside)
   * @param kicking - Team performing the kickoff
   * @returns Updated game state and events
   */
  performKickoff(state: GameState, type: 'normal'|'onside', kicking: TeamSide): { state: GameState; events: FlowEvent[] } {
    return performKickoffExt(state, type, kicking, {
      rng: this.ctx.rng,
      timeKeeping: this.ctx.timeKeeping,
      isLeading: (s, score) => isLeading(s, score),
      isTied: (score) => isTied(score),
      formatTeamYardLine: (p, b) => formatTeamYardLine(p, b),
    });
  }

  // Private helper methods

  private beginDriveIfNeeded(state: GameState, events: FlowEvent[]): void {
    this.tracker.beginDriveIfNeeded(state, events, (p, b) => formatTeamYardLine(p, b));
  }

  private endDriveSummaryIfAny(state: GameState, events: FlowEvent[], reason: string): void {
    this.tracker.endDriveSummaryIfAny(state, events, reason);
  }

  private hudPayload(s: GameState) {
    return hudPayloadExt(s);
  }

  private determineTempoForPlay(pre: GameState): TempoStrategy {
    const preDiff = pre.score.player - pre.score.ai;
    const tempoCtx: TempoContext = {
      quarter: pre.quarter,
      clock: pre.clock,
      diff: (pre.possession === 'player') ? preDiff : -preDiff,
      side: pre.possession
    };

    return this.ctx.policy?.chooseTempo ?
      this.ctx.policy.chooseTempo(tempoCtx) as TempoStrategy :
      determineTempo(tempoCtx);
  }

  private handlePenalty(pre: GameState, res: any, events: FlowEvent[]): { state: GameState; events: FlowEvent[] } {
    const outcome: any = res.outcome;
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
      const fin = this.finalizePenaltyDecision(decision === 'accept' ? admin.accepted : admin.declined, decision, admin.adminMeta, { on: pen.on, yards: pen.yards });
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
      accepted: admin.accepted,
      declined: admin.declined,
      penalty: { on: pen.on, yards: pen.yards, firstDown: pen.firstDown },
      meta: {
        halfDistanceCapped: admin.adminMeta.halfDistanceCapped,
        measuredFromMidfieldForLG: admin.adminMeta.measuredFromMidfieldForLG,
        spotBasis: admin.adminMeta.spotBasis,
        untimedDownScheduled: admin.adminMeta.untimedDownScheduled,
      },
    };
    events.push({ type: 'choice-required', choice: 'penaltyAcceptDecline', data: payload });
    events.push({ type: 'hud', payload: this.hudPayload(pre) });
    return { state: pre, events };
  }

  private narratePlayResult(pre: GameState, next: GameState, input: PlayInput, res: any, events: FlowEvent[], isPuntCard: boolean): void {
    try {
      // Skip generic summary for explicit punt handling to avoid duplication and misleading 'Play' result
      const puntSummarySkip = isPuntCard && pre.down === 4;
      if (!puntSummarySkip) {
        const summary = this.buildResultSummary(pre, next, res.outcome as Outcome | undefined, { td: Boolean(res.touchdown), safety: Boolean(res.safety) }, String(input.playLabel), String(input.defenseLabel));
        this.tracker.incrementPlayInDrive();
        this.tracker.incrementRunOrPassByLabel(String(input.playLabel || ''));
        const call = this.buildBroadcastCall(pre, next, input, res.outcome as any);
        events.push({ type: 'log', message: `Brad: ${call.pbp}` });
        if (call.analyst && call.analyst.trim()) events.push({ type: 'log', message: `Rob: ${call.analyst}` });
        events.push({ type: 'log', message: '────────' });
      }
    } catch (error) {
      // Silently handle narration errors to prevent game flow interruption
    }
  }

  private updateLastNotes(pre: GameState, input: PlayInput): void {
    try {
      const yardsToGoal = pre.possession === 'player' ? (100 - pre.ballOn) : pre.ballOn;
      const abs = pre.ballOn;
      const acrossMid = (pre.possession === 'player') ? abs >= 50 : abs <= 50;
      const nearMid = abs >= 45 && abs <= 55;
      const backedUp = (pre.possession === 'player') ? abs <= 10 : abs >= 90;
      let zone: string | null = null;
      if (yardsToGoal <= 10 && pre.toGo >= yardsToGoal) zone = 'GoalToGo';
      else if (yardsToGoal <= 20) zone = 'RedZone';
      else if (nearMid) zone = 'NearMid';
      else if (acrossMid) zone = 'AcrossMid';
      else if (backedUp) zone = 'BackedUp';
      const inRange = (yardsToGoal + 17) <= 45;
      this.tracker.setLastNotesForSide(pre.possession, { zone, fgInRange: inRange, defense: String(input.defenseLabel || '') });
    } catch (error) {
      // Silently handle note update errors
    }
  }

  private handleTouchdown(pre: GameState, next: GameState, events: FlowEvent[]): { state: GameState; events: FlowEvent[] } {
    next.awaitingPAT = true;
    const side: TeamSide = pre.possession;
    events.push({ type: 'log', message: 'Touchdown!' });
    events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 6), kind: 'TD' } });
    events.push({ type: 'vfx', payload: { kind: 'td' } });
    const pat = this.resolvePATAndRestart(next, side);
    next = pat.state as any;
    events.push(...pat.events);
    events.push({ type: 'log', message: `Brad: Scoreboard — HOME ${next.score.player} — AWAY ${next.score.ai} — Q${next.quarter} ${formatClock(next.clock)}` });
    events.push({ type: 'log', message: '────────' });
    this.endDriveSummaryIfAny(next, events, 'touchdown');
    return { state: next, events };
  }

  private handleSafety(pre: GameState, next: GameState, events: FlowEvent[]): { state: GameState; events: FlowEvent[] } {
    const conceding: TeamSide = pre.possession;
    const scoringSide: TeamSide = conceding === 'player' ? 'ai' : 'player';
    events.push({ type: 'log', message: 'Brad: Safety!' });
    events.push({ type: 'score', payload: { ...scoringSideToDelta(scoringSide, 2), kind: 'Safety' } });
    events.push({ type: 'log', message: `Brad: Scoreboard — HOME ${ (scoringSide==='player'? next.score.player+2: next.score.player) } — AWAY ${ (scoringSide==='ai'? next.score.ai+2: next.score.ai) } — safety awarded` });
    const safetyRes = this.resolveSafetyRestart(next, conceding);
    next = safetyRes.state as any;
    events.push(...safetyRes.events);
    events.push({ type: 'log', message: '────────' });
    this.endDriveSummaryIfAny(next, events, 'safety');
    return { state: next, events };
  }

  private isTurnoverOnDowns(pre: GameState, outcome: Outcome | undefined): boolean {
    if (pre.down !== 4 || !outcome) return false;

    return (
      outcome.category === 'incomplete' ||
      ((outcome.category === 'loss' || outcome.category === 'gain') && (outcome.yards || 0) < pre.toGo)
    );
  }

  private handleTurnoverOnDowns(pre: GameState, next: GameState, events: FlowEvent[]): { state: GameState; events: FlowEvent[] } {
    const spot = formatTeamYardLine(pre.possession, pre.ballOn);
    events.push({ type: 'log', message: `Brad: ${formatOrdinal(pre.down)} & ${pre.toGo} — stuffed — turnover on downs at ${spot}` });
    next.possession = pre.possession === 'player' ? 'ai' : 'player';
    next.down = 1; next.toGo = 10;
    this.endDriveSummaryIfAny(next, events, 'downs');
    events.push({ type: 'log', message: '────────' });
    return { state: next, events };
  }

  private handleQuarterTransition(next: GameState, events: FlowEvent[]): { state: GameState; events: FlowEvent[] } {
    const endedQuarter = next.quarter;
    events.push({ type: 'endOfQuarter', payload: { quarter: endedQuarter } });

    // Quarter recap: short narrative with basic stats
    try {
      const qs = this.tracker.getQuarterStatsRef();
      const runs = qs.runs;
      const passes = qs.passes;
      const s = `End of Q${endedQuarter} — HOME ${next.score.player} — AWAY ${next.score.ai}.`;
      const brad = `${s} Pace so far: ${runs} runs, ${passes} passes.`;
      const rob = (runs > passes) ? 'Ground games setting tone; watch for play action next quarter.' : (passes > runs ? 'Air it out approach; watch the pass rush fatigue.' : 'Balanced so far; both sides settling in.');
      events.push({ type: 'log', message: `Brad: ${brad}` });
      events.push({ type: 'log', message: `Rob: ${rob}` });
    } catch (error) {
      // Silently handle quarter recap errors
    }

    // Reset quarter counters
    const qs = this.tracker.getQuarterStatsRef();
    qs.quarter = endedQuarter + 1;
    qs.runs = 0; qs.passes = 0; qs.pointsHome = 0; qs.pointsAway = 0; qs.explosives = 0; qs.turnovers = 0;

    if (endedQuarter === 2) {
      // Halftime then start Q3 with kickoff
      events.push({ type: 'halftime' });
      events.push({ type: 'log', message: 'Start of quarter 3.' });
      next.quarter = 3;
      next.clock = 15 * 60;
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
      events.push({ type: 'log', message: `Brad: Start of quarter ${endedQuarter + 1}.` });
      next.quarter = endedQuarter + 1;
      next.clock = 15 * 60;
    }

    events.push({ type: 'log', message: '────────' });
    return { state: next, events };
  }

  private buildBroadcastCall(pre: GameState, next: GameState, input: PlayInput, outcome: Outcome | undefined): { pbp: string; analyst: string } {
    return buildBroadcastCallExt(pre, next, input, outcome, {
      rng: this.ctx.rng,
      playInDrive: this.tracker.getPlayInDrive(),
      formatClock: (n) => formatClock(n),
      formatOrdinal: (n) => formatOrdinal(n),
      formatTeamYardLine: (p, b) => formatTeamYardLine(p, b),
      formatPossessionSpotForBroadcast: (p, b) => formatPossessionSpotForBroadcast(p, b),
      quarterStats: this.tracker.getQuarterStatsRef(),
    });
  }

  private buildResultSummary(pre: GameState, next: GameState, outcome: Outcome | undefined, flags: { td?: boolean; safety?: boolean }, currentPlayLabel: string, defenseLabel: string): { result: string; notes: string[] } {
    return buildResultSummaryExt(pre, next, outcome, flags, currentPlayLabel, defenseLabel, {
      formatOrdinal: (n) => formatOrdinal(n),
      formatTeamYardLine: (p, b) => formatTeamYardLine(p, b),
      rng: () => this.ctx.rng?.() || Math.random(),
      getLastNotesForSide: (side) => this.tracker.getLastNotesForSide(side),
      setLastNotesForSide: (side, notes) => this.tracker.setLastNotesForSide(side, notes),
    });
  }

  private chooseCommentaryLines(notes: string[]): { pbp: string; analyst: string } {
    return chooseCommentaryLinesExt(notes);
  }
}
