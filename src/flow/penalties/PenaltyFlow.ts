import type { GameState } from '../../domain/GameState';
import type { AdminResult } from '../../rules/PenaltyAdmin';
import type { FlowEvent } from '../types';

export function finalizePenaltyDecision(
  chosen: GameState,
  decision: 'accept'|'decline',
  meta: AdminResult['adminMeta'],
  deps: {
    formatOrdinal: (n: number) => string;
    hudPayload: (s: GameState) => any;
  },
  info?: { on: 'offense'|'defense'; yards: number }
): { state: GameState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  let next = { ...chosen } as GameState & { untimedDownScheduled?: boolean };
  try {
    const on = info?.on || 'defense';
    const yards = info?.yards || 0;
    const downText = `${deps.formatOrdinal(next.down)} & ${next.toGo}`;
    const msg = decision === 'accept'
      ? `Penalty on ${on}, ${yards} yards — accepted; now ${downText}`
      : `Penalty on ${on}, ${yards} yards — declined; play stands; now ${downText}`;
    events.push({ type: 'log', message: msg });
  } catch {}
  if (meta.untimedDownScheduled) {
    (next as any).untimedDownScheduled = true;
    events.push({ type: 'log', message: 'Untimed down will be played due to defensive penalty.' });
  }
  if (!next.gameOver && !next.awaitingPAT) {
    const untimedNow = Boolean((next as any).untimedDownScheduled);
    if (next.clock === 0 && !untimedNow) {
      const endedQuarter = next.quarter;
      events.push({ type: 'endOfQuarter', payload: { quarter: endedQuarter } });
      events.push({ type: 'log', message: `End of Q${endedQuarter} — HOME ${next.score.player} — AWAY ${next.score.ai}` });
      if (endedQuarter === 2) {
        events.push({ type: 'halftime' });
        next.quarter = 3;
        next.clock = 15 * 60;
      } else if (endedQuarter === 4) {
        next.gameOver = true;
        events.push({ type: 'final', payload: { score: next.score } });
      } else {
        next.quarter = endedQuarter + 1;
        next.clock = 15 * 60;
      }
    }
  }
  events.push({ type: 'hud', payload: deps.hudPayload(next) });
  return { state: next, events };
}


