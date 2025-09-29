import { resolvePlayCore } from '../rules/ResolvePlayCore';
import { administerPenalty } from '../rules/PenaltyAdmin';
import { DEFAULT_TIME_KEEPING } from '../rules/ResultParsing';
import { timeOffWithTwoMinute } from '../rules/Timekeeping';
import { resolveKickoff } from '../rules/special/Kickoff';
import { attemptFieldGoal as attemptFieldGoalKick, PLACE_KICK_TABLE, rollD6 as rollD6PK } from '../rules/special/PlaceKicking';
import { missedFieldGoalSpot } from '../rules/Spots';
function isTwoMinute(quarter, clock) {
    return (quarter === 2 || quarter === 4) && clock <= 120;
}
function clampYard(abs) {
    return Math.max(0, Math.min(100, abs));
}
function nextDownDistanceAfterKickoff(prev) {
    return { down: 1, toGo: 10 };
}
function scoringSideToDelta(side, points) {
    return side === 'player' ? { playerDelta: points, aiDelta: 0 } : { playerDelta: 0, aiDelta: points };
}
function attemptPatInternal(rng) {
    // 2D6 using place kicking table's PAT column
    const roll = rollD6PK(rng) + rollD6PK(rng);
    const row = PLACE_KICK_TABLE[roll] || {};
    return row.PAT === 'G';
}
export class GameFlow {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    resolveSnap(state, input) {
        const events = [];
        // Respect untimed down scheduling: if present, do not advance time this snap
        const hadUntimed = Boolean(state.untimedDownScheduled);
        const pre = { ...state };
        const res = resolvePlayCore({ state: pre, charts: this.ctx.charts, deckName: input.deckName, playLabel: input.playLabel, defenseLabel: input.defenseLabel, rng: this.ctx.rng });
        // Penalty handling: branch to accept/decline flow
        if (res.outcome && res.outcome.category === 'penalty' && res.outcome.penalty) {
            const outcome = res.outcome;
            const admin = administerPenalty({
                prePlayState: pre,
                postPlayState: pre,
                offenseGainedYards: 0,
                outcome,
                inTwoMinute: isTwoMinute(pre.quarter, pre.clock),
                wasFirstDownOnPlay: false,
            });
            const pen = outcome.penalty;
            const decidingSide = pen.on === 'defense' ? pre.possession : (pre.possession === 'player' ? 'ai' : 'player');
            // If AI decides, pick immediately using hint (default accept on tie)
            if (decidingSide === 'ai') {
                const decision = admin.decisionHint === 'decline' ? 'decline' : 'accept';
                const fin = this.finalizePenaltyDecision(decision === 'accept' ? admin.accepted : admin.declined, decision, admin.adminMeta);
                const nextState = fin.state;
                events.push(...fin.events);
                events.push({ type: 'hud', payload: this.hudPayload(nextState) });
                return { state: nextState, events };
            }
            // Human decides: emit choice-required and hold state
            const payload = {
                side: 'player',
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
        let next = { ...res.state };
        // Compute time off with two-minute rules unless untimed down applies
        const inTwoBefore = isTwoMinute(pre.quarter, pre.clock);
        let timeOff = 0;
        let crossedTwoMinute = false;
        if (!hadUntimed) {
            const wasFirstDown = !res.possessionChanged && (res.outcome && res.outcome.category === 'gain' && (res.outcome.yards || 0) > 0 && (res.outcome.yards || 0) >= pre.toGo);
            timeOff = timeOffWithTwoMinute(res.outcome, inTwoBefore, wasFirstDown);
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
            const side = pre.possession;
            events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 6), kind: 'TD' } });
            events.push({ type: 'vfx', payload: { kind: 'td' } });
            const pat = this.resolvePATAndRestart(next, side);
            next = pat.state;
            events.push(...pat.events);
        }
        else if (res.safety) {
            // Points already in state by rules; award event
            const conceding = pre.possession;
            const scoringSide = conceding === 'player' ? 'ai' : 'player';
            events.push({ type: 'score', payload: { ...scoringSideToDelta(scoringSide, 2), kind: 'Safety' } });
            const safetyRes = this.resolveSafetyRestart(next, conceding);
            next = safetyRes.state;
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
                    const openingReceiver = next.openingKickTo || 'player';
                    const kickTeam = openingReceiver;
                    const ko = this.performKickoff(next, 'normal', kickTeam);
                    next = ko.state;
                    events.push(...ko.events);
                }
                else if (endedQuarter === 4) {
                    next.gameOver = true;
                    events.push({ type: 'final', payload: { score: next.score } });
                }
                else {
                    // Q1->Q2 or Q3->Q4
                    next.quarter = endedQuarter + 1;
                    next.clock = 15 * 60;
                }
            }
        }
        events.push({ type: 'hud', payload: this.hudPayload(next) });
        return { state: next, events };
    }
    finalizePenaltyDecision(chosen, decision, meta) {
        const events = [];
        let next = { ...chosen };
        // Narrate decision
        events.push({ type: 'log', message: decision === 'accept' ? 'Penalty accepted.' : 'Penalty declined. The play stands.' });
        if (meta.untimedDownScheduled) {
            next.untimedDownScheduled = true;
            events.push({ type: 'log', message: 'Untimed down will be played due to defensive penalty.' });
        }
        // Period transitions similar to normal flow
        if (!next.gameOver && !next.awaitingPAT) {
            const untimedNow = Boolean(next.untimedDownScheduled);
            if (next.clock === 0 && !untimedNow) {
                const endedQuarter = next.quarter;
                events.push({ type: 'endOfQuarter', payload: { quarter: endedQuarter } });
                if (endedQuarter === 2) {
                    events.push({ type: 'halftime' });
                    next.quarter = 3;
                    next.clock = 15 * 60;
                    // Kickoff at start of half handled by caller via performKickoff if needed elsewhere
                }
                else if (endedQuarter === 4) {
                    next.gameOver = true;
                    events.push({ type: 'final', payload: { score: next.score } });
                }
                else {
                    next.quarter = endedQuarter + 1;
                    next.clock = 15 * 60;
                }
            }
        }
        // Always push HUD update for current state
        events.push({ type: 'hud', payload: this.hudPayload(next) });
        return { state: next, events };
    }
    resolvePATAndRestart(state, side) {
        const events = [];
        let next = { ...state };
        const diff = next.score.player - next.score.ai;
        const decision = this.ctx.policy?.choosePAT?.({ diff, quarter: next.quarter, clock: next.clock, side })
            ?? (side === 'ai' ? (this.defaultAIShouldGoForTwo({ diff, quarter: next.quarter, clock: next.clock }) ? 'two' : 'kick') : 'kick');
        if (decision === 'two') {
            const success = this.ctx.rng() < 0.5;
            if (success) {
                if (side === 'player')
                    next.score.player += 2;
                else
                    next.score.ai += 2;
                events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 2), kind: 'TwoPoint' } });
            }
        }
        else {
            const good = attemptPatInternal(this.ctx.rng);
            if (good) {
                if (side === 'player')
                    next.score.player += 1;
                else
                    next.score.ai += 1;
                events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 1), kind: 'XP' } });
            }
        }
        next.awaitingPAT = false;
        // Kickoff by scoring team
        const koType = this.ctx.policy?.chooseKickoffType?.({ trailing: this.isTrailing(side, next.score), quarter: next.quarter, clock: next.clock }) ?? 'normal';
        const ko = this.performKickoff(next, koType, side);
        const out = ko.state;
        events.push(...ko.events);
        return { state: out, events };
    }
    attemptFieldGoal(state, attemptYards, side) {
        const events = [];
        let next = { ...state };
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
            if (side === 'player')
                next.score.player += 3;
            else
                next.score.ai += 3;
            events.push({ type: 'score', payload: { ...scoringSideToDelta(side, 3), kind: 'FG' } });
            const ko = this.performKickoff(next, 'normal', side);
            next = ko.state;
            events.push(...ko.events);
        }
        else {
            // Miss: defense takes over per centralized Spots rule
            const miss = missedFieldGoalSpot({ ballOn: next.ballOn, possessing: side }, 
            // attemptYards is already provided; pass through for future variants
            attemptYards);
            next.possession = miss.possession;
            next.ballOn = miss.ballOn;
            const dd = nextDownDistanceAfterKickoff(next);
            next.down = dd.down;
            next.toGo = dd.toGo;
            events.push({ type: 'log', message: 'Field goal missed. Turnover on downs at spot.' });
        }
        events.push({ type: 'hud', payload: this.hudPayload(next) });
        return { state: next, events };
    }
    resolveSafetyRestart(state, conceding) {
        const events = [];
        let next = { ...state };
        const leading = this.isLeading(conceding === 'player' ? 'ai' : 'player', next.score);
        const choice = this.ctx.policy?.chooseSafetyFreeKick?.({ leading }) ?? 'kickoff+25';
        // After safety, free kick by conceding team
        const kicking = conceding;
        if (choice === 'kickoff+25') {
            // Receiving team takes at +25 from their goal
            const receiver = kicking === 'player' ? 'ai' : 'player';
            const abs = receiver === 'player' ? 25 : 75;
            next.possession = receiver;
            next.ballOn = abs;
            const dd = nextDownDistanceAfterKickoff(next);
            next.down = dd.down;
            next.toGo = dd.toGo;
            events.push({ type: 'kickoff', payload: { onside: false } });
        }
        else {
            // Free-kick punt from own 20: model as a punt with fixed ballOn 20
            // Minimalism: place ball to receiving at 35 yard line equivalent
            const receiver = kicking === 'player' ? 'ai' : 'player';
            const abs = receiver === 'player' ? 35 : 65;
            next.possession = receiver;
            next.ballOn = abs;
            const dd = nextDownDistanceAfterKickoff(next);
            next.down = dd.down;
            next.toGo = dd.toGo;
            events.push({ type: 'kickoff', payload: { onside: false } });
        }
        events.push({ type: 'hud', payload: this.hudPayload(next) });
        return { state: next, events };
    }
    performKickoff(state, type, kicking) {
        const events = [];
        let next = { ...state };
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
        const receiver = kicking === 'player' ? 'ai' : 'player';
        const absYard = receiver === 'player' ? ko.yardLine : 100 - ko.yardLine;
        // If turnover on kickoff, possession stays with kicker at same absolute spot
        next.possession = ko.turnover ? kicking : receiver;
        next.ballOn = clampYard(absYard);
        const dd = nextDownDistanceAfterKickoff(next);
        next.down = dd.down;
        next.toGo = dd.toGo;
        events.push({ type: 'kickoff', payload: { onside } });
        events.push({ type: 'hud', payload: this.hudPayload(next) });
        return { state: next, events };
    }
    hudPayload(s) {
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
    isLeading(side, score) {
        const diff = score.player - score.ai;
        return (side === 'player' ? diff : -diff) > 0;
    }
    isTrailing(side, score) {
        const diff = score.player - score.ai;
        return (side === 'player' ? diff : -diff) < 0;
    }
    isTied(score) {
        return score.player === score.ai;
    }
    defaultAIShouldGoForTwo(ctx) {
        const late = ctx.quarter === 4 && ctx.clock <= 5 * 60;
        // Trailing by 1 or 2 late
        if (ctx.diff < 0 && -ctx.diff <= 2 && late)
            return true;
        return false;
    }
}
//# sourceMappingURL=GameFlow.js.map