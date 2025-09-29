export interface SpotContext {
  ballOn: number; // 0..100, HOME perspective
  possessing: 'player' | 'ai';
}

function clampYard(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function isInEndZone(absYard: number): boolean {
  return absYard === 0 || absYard === 100;
}

export function isThroughEndZone(absYard: number): boolean {
  return absYard < 0 || absYard > 100;
}

export function touchbackSpot(forReceiving: 'player' | 'ai'): number {
  return forReceiving === 'player' ? 20 : 80;
}

export function interceptionTouchback(ctx: SpotContext): { ballOn: number; possession: 'player' | 'ai' } {
  const ballOn = touchbackSpot(ctx.possessing);
  return { ballOn, possession: ctx.possessing };
}

export function kickoffTouchback(forReceiving: 'player' | 'ai'): { ballOn: number; possession: 'player' | 'ai' } {
  return { ballOn: touchbackSpot(forReceiving), possession: forReceiving };
}

export function puntTouchback(forReceiving: 'player' | 'ai'): { ballOn: number; possession: 'player' | 'ai' } {
  return { ballOn: touchbackSpot(forReceiving), possession: forReceiving };
}

// Apply “spot of kick or 20”: if the kick spot is beyond the 20 (closer to opponent),
// take over at the spot; otherwise take at the 20.
export function missedFieldGoalSpot(state: SpotContext, attemptYards: number): { ballOn: number; possession: 'player' | 'ai' } {
  const receiving: 'player' | 'ai' = state.possessing === 'player' ? 'ai' : 'player';
  const spotOfKickAbs = clampYard(state.possessing === 'player' ? state.ballOn - 7 : state.ballOn + 7);
  // Apply spot-of-kick or 20: for HOME (player) receiving, take max(20, spot); for AWAY (ai) receiving, take min(80, spot)
  let newAbs: number;
  if (receiving === 'player') newAbs = Math.max(20, spotOfKickAbs);
  else newAbs = Math.min(80, spotOfKickAbs);
  return { ballOn: clampYard(newAbs), possession: receiving };
}


