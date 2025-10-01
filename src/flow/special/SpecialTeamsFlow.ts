import type { GameState, TeamSide } from '../../domain/GameState';
import { resolveKickoff } from '../../rules/special/Kickoff';
import { resolvePunt } from '../../rules/special/Punt';
import { resolveLongGain } from '../../rules/LongGain';
import { DEFAULT_TIME_KEEPING } from '../../rules/ResultParsing';
import type { TimeKeeping } from '../../data/schemas/Timekeeping';
import type { FlowEvent } from '../types';
import type { RNG } from '../../sim/RNG';

export function performKickoff(
  state: GameState,
  type: 'normal'|'onside',
  kicking: TeamSide,
  deps: {
    rng: RNG;
    timeKeeping: TimeKeeping;
    isLeading: (side: TeamSide, score: GameState['score']) => boolean;
    isTied: (score: GameState['score']) => boolean;
    formatTeamYardLine: (possessing: TeamSide, ballOn: number) => string;
  }
): { state: GameState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  let next = { ...state } as GameState;
  const tk = deps.timeKeeping || DEFAULT_TIME_KEEPING;
  let timeOff = tk.kickoff;
  if ((next.quarter === 2 || next.quarter === 4) && next.clock > 120 && next.clock - timeOff < 120) {
    timeOff = next.clock - 120;
    events.push({ type: 'log', message: 'Two-minute warning.' });
    events.push({ type: 'vfx', payload: { kind: 'twoMinute' } });
  }
  next.clock = Math.max(0, next.clock - timeOff);

  const onside = type === 'onside';
  const kickerLeadingOrTied = deps.isLeading(kicking, next.score) || deps.isTied(next.score);
  const ko = resolveKickoff(deps.rng, { onside, kickerLeadingOrTied });
  const receiver: TeamSide = kicking === 'player' ? 'ai' : 'player';
  const absYard = receiver === 'player' ? ko.yardLine : 100 - ko.yardLine;
  next.possession = ko.turnover ? kicking : receiver;
  next.ballOn = Math.max(0, Math.min(100, absYard));
  const dd = { down: 1, toGo: 10 } as const;
  next.down = dd.down; next.toGo = dd.toGo;
  events.push({ type: 'kickoff', payload: { onside } });
  try {
    const receiverSide: TeamSide = next.possession;
    const yardText = deps.formatTeamYardLine(receiverSide, next.ballOn);
    const pick = <T>(arr: T[]): T => arr[Math.floor(((deps.rng?.() || Math.random())) * arr.length)]!;
    const traj = pick(['a high hanger','a booming end-over-end','a wobbly spiral','a knuckleball','a low liner']);
    const angle = pick(['toward the near numbers','to the far sideline','between the hashes','to the right numbers','to the left numbers']);
    const caughtAt = pick(['the goal line','the five','the three']);
    const advancement = receiverSide === 'player' ? next.ballOn : (100 - next.ballOn);
    const bigReturn = advancement >= 55;
    const hugeReturn = advancement >= 70;
    const normalPaths = ['angles left, then up the seam','up the middle, bounces outside','zigs past the first wave, then squared up'];
    const stuffedPaths = ['straight ahead, no crease','met by the first wave, stacked'];
    const explosivePaths = ['hits the crease and bursts free','finds daylight down the sideline','cuts back and turns on the jets'];
    const path = hugeReturn ? pick(explosivePaths) : (bigReturn ? pick(normalPaths) : pick([...normalPaths, ...stuffedPaths]));
    const brad = hugeReturn
      ? `And away we go — ${traj} ${angle}. Caught at ${caughtAt}, ${path} — all the way to ${yardText}!`
      : (bigReturn
        ? `And away we go — ${traj} ${angle}. Caught at ${caughtAt}, ${path} — big return to ${yardText}.`
        : `And away we go — ${traj} ${angle}. Caught at ${caughtAt}, ${path} — brought to ${yardText}.`);
    const rob = hugeReturn
      ? pick(['Coverage bust — contain lost leverage and the lane opened wide.','Out-kicked the coverage — return team found a runway.', 'Missed fits across the board — explosive return.'])
      : (bigReturn
        ? pick(['Out-kicked the coverage — return team found daylight.','Gunners got washed — edge was there.'])
        : pick(['Coverage lanes stayed disciplined — no big gap to hit.','Good hang gave the gunners time — textbook coverage.','Return set it up, but contain held firm.']));
    events.push({ type: 'log', message: `Brad: ${brad}` });
    events.push({ type: 'log', message: `Rob: ${rob}` });
  } catch {}
  events.push({ type: 'hud', payload: {
    quarter: next.quarter, clock: next.clock, down: next.down, toGo: next.toGo, ballOn: next.ballOn, possession: next.possession, score: { player: next.score.player, ai: next.score.ai }
  } });
  return { state: next, events };
}

export function handleFourthDownPunt(
  pre: GameState,
  next: GameState,
  deps: {
    rng: RNG;
    formatTeamYardLine: (possessing: TeamSide, ballOn: number) => string;
    endDriveSummaryIfAny: (state: GameState, events: FlowEvent[], reason: string) => void;
  }
): { state: GameState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  const puntingTeam: TeamSide = pre.possession;
  const punt = resolvePunt({ ballOn: pre.ballOn, puntingTeam }, deps.rng, resolveLongGain);
  const fromYL = deps.formatTeamYardLine(puntingTeam, pre.ballOn);
  const receiving: TeamSide = puntingTeam === 'player' ? 'ai' : 'player';
  const toYL = deps.formatTeamYardLine(punt.possessionFlips ? receiving : puntingTeam, punt.ballOn);
  const dist = typeof punt.distance === 'number' ? punt.distance : undefined;
  const ret = punt.returnYards || 0;
  const pick = <T>(arr: T[]): T => arr[Math.floor(((deps.rng?.() || Math.random())) * arr.length)]!;
  const traj = pick(['booming end-over-end','tight spiral','wobbly spiral','low driving kick','high hanging punt']);
  const angle = pick(['toward the boundary','angling to the near hash','to the far numbers','middle of the field']);
  const retPath = ret >= 15 ? pick(['up the seam','bounces outside','cuts back against pursuit']) : pick(['met square by the first wave','slips one, then wrapped','no room, stacked early']);
  const brad = `${traj} from ${fromYL}, ${angle}. Return ${retPath} for ${ret}, down at ${toYL}.`;
  const rob = ret >= 15 ? 'Out-kicked the coverage — return team found daylight.' : 'Hang time and lanes — coverage wins that down.';
  events.push({ type: 'log', message: `Brad: ${brad}` });
  events.push({ type: 'log', message: `Rob: ${rob}` });
  next.possession = punt.possessionFlips ? (puntingTeam === 'player' ? 'ai' : 'player') : puntingTeam;
  next.ballOn = punt.ballOn;
  const dd = { down: 1, toGo: 10 } as const;
  next.down = dd.down; next.toGo = dd.toGo;
  deps.endDriveSummaryIfAny(next, events, 'punt');
  events.push({ type: 'hud', payload: {
    quarter: next.quarter, clock: next.clock, down: next.down, toGo: next.toGo, ballOn: next.ballOn, possession: next.possession, score: { player: next.score.player, ai: next.score.ai }
  } });
  return { state: next, events };
}


