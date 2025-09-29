export type TeamSide = 'player' | 'ai';

export interface Score {
  player: number;
  ai: number;
}

export interface GameState {
  seed: number;
  quarter: number;
  clock: number; // seconds remaining in quarter
  down: number;
  toGo: number;
  ballOn: number; // 0..100, from HOME goal line perspective
  possession: TeamSide;
  awaitingPAT: boolean;
  gameOver: boolean;
  score: Score;
}

export function createInitialGameState(seed: number): GameState {
  return {
    seed,
    quarter: 1,
    clock: 15 * 60,
    down: 1,
    toGo: 10,
    ballOn: 25,
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 0, ai: 0 },
  };
}


