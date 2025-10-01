// Shared flow types to avoid circular dependencies
export type FlowEvent =
  | { type: 'hud'; payload: any }
  | { type: 'log'; message: string }
  | { type: 'vfx'; payload: { kind: string; data?: any } }
  | { type: 'choice-required'; choice: 'puntReturn'|'safetyFreeKick'|'onsideOrNormal'|'penaltyAcceptDecline'|'patChoice'; data: any }
  | { type: 'score'; payload: { playerDelta: number; aiDelta: number; kind: 'TD'|'FG'|'Safety'|'XP'|'TwoPoint' } }
  | { type: 'kickoff'; payload: { onside: boolean } }
  | { type: 'endOfQuarter'; payload: { quarter: number } }
  | { type: 'halftime' }
  | { type: 'final'; payload: { score: { player: number; ai: number } } }
  | { type: 'untimedDownScheduled' };

export type PlayInput = {
  deckName: string;
  playLabel: string;
  defenseLabel: string;
};

// Using type-only imports to avoid runtime circular dependencies
type OffenseCharts = any;
type RNG = any;
type TimeKeeping = any;

export type FlowContext = {
  charts: OffenseCharts;
  rng: RNG;
  policy?: {
    choosePAT?(ctx: { diff: number; quarter: number; clock: number; side: 'player'|'ai' }): 'kick'|'two';
    chooseSafetyFreeKick?(ctx: { leading: boolean }): 'kickoff+25'|'puntFrom20';
    chooseKickoffType?(ctx: { trailing: boolean; quarter: number; clock: number }): 'normal'|'onside';
    chooseTempo?(ctx: { quarter: number; clock: number; diff: number; side: 'player'|'ai' }): 'normal'|'hurry_up'|'burn_clock'|'no_huddle';
  };
  timeKeeping: TimeKeeping;
};
