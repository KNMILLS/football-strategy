import type { GameState, TeamSide } from '../../domain/GameState';
import type { FlowEvent } from '../types';

export function resolveSafetyRestart(
  state: GameState,
  conceding: TeamSide,
  deps: {
    chooseSafetyFreeKick?: (ctx: { leading: boolean }) => 'kickoff+25'|'puntFrom20';
    isLeading: (side: TeamSide, score: GameState['score']) => boolean;
  }
): { state: GameState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  let next = { ...state } as GameState;
  const leading = deps.isLeading(conceding === 'player' ? 'ai' : 'player', next.score);
  const choice = deps.chooseSafetyFreeKick?.({ leading }) ?? 'kickoff+25';
  const kicking: TeamSide = conceding;
  if (choice === 'kickoff+25') {
    const receiver: TeamSide = kicking === 'player' ? 'ai' : 'player';
    const abs = receiver === 'player' ? 25 : 75;
    next.possession = receiver;
    next.ballOn = abs;
    const dd = { down: 1, toGo: 10 } as const;
    next.down = dd.down; next.toGo = dd.toGo;
    events.push({ type: 'kickoff', payload: { onside: false } });
  } else {
    const receiver: TeamSide = kicking === 'player' ? 'ai' : 'player';
    const abs = receiver === 'player' ? 35 : 65;
    next.possession = receiver;
    next.ballOn = abs;
    const dd = { down: 1, toGo: 10 } as const;
    next.down = dd.down; next.toGo = dd.toGo;
    events.push({ type: 'kickoff', payload: { onside: false } });
  }
  events.push({ type: 'hud', payload: {
    quarter: next.quarter, clock: next.clock, down: next.down, toGo: next.toGo, ballOn: next.ballOn, possession: next.possession, score: { player: next.score.player, ai: next.score.ai }
  } });
  return { state: next, events };
}


