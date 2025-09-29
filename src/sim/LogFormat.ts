import type { FlowEvent } from '../flow/GameFlow';

interface FormatCtx { finalHome: number; finalAway: number }

function line(s: string): string { return s + '\n'; }

export function formatEventsToLegacyLog(events: FlowEvent[], ctx: FormatCtx): string {
  let out = '';
  for (const ev of events) {
    if (ev.type === 'log') {
      out += line(ev.message);
    } else if (ev.type === 'score') {
      const { playerDelta, aiDelta, kind } = ev.payload;
      if (kind === 'TD') {
        if (playerDelta === 6) out += line('HOME scores 6 points.');
        if (aiDelta === 6) out += line('AWAY scores 6 points.');
      } else if (kind === 'XP') {
        if (playerDelta === 1) out += line('Extra point is good.');
        if (aiDelta === 1) out += line('AI extra point is good.');
        if (playerDelta === 0 && aiDelta === 0) {
          // We only emit miss line if no delta emitted for XP attempt
          // Keep legacy narrator variants
          out += line('Extra point missed.');
        }
      } else if (kind === 'TwoPoint') {
        // We do not know success/fail directly from event; presence implies success
        out += line('Two-point conversion good.');
      } else if (kind === 'FG') {
        // Legacy did not emit explicit FG lines in golden log; rely on underlying log events if any
      } else if (kind === 'Safety') {
        if (playerDelta === 2) out += line('Safety! HOME is awarded 2 points.');
        if (aiDelta === 2) out += line('Safety! AWAY is awarded 2 points.');
      }
    } else if (ev.type === 'endOfQuarter') {
      // Legacy baseline likely includes end of quarter lines; keep minimal
      out += line(`End of Q${ev.payload.quarter}`);
    } else if (ev.type === 'halftime') {
      out += line('Halftime');
    } else if (ev.type === 'kickoff') {
      // No explicit line in baseline for kickoff events
    }
  }
  // Final line
  out += `Final: HOME ${ctx.finalHome} — AWAY ${ctx.finalAway}`;
  return out;
}


