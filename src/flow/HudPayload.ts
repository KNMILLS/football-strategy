import type { GameState } from '../domain/GameState';

export function hudPayload(s: GameState) {
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


