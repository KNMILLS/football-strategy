import type { GameState, TeamSide } from '../../domain/GameState';
import type { RNG } from '../../sim/RNG';
import type { Outcome } from '../../rules/ResultParsing';
import type { PlayInput } from '../types';

export function chooseCommentaryLines(notes: string[]): { pbp: string; analyst: string } {
  const cleaned = (notes || []).map((n) => String(n).replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (cleaned.length === 0) return { pbp: 'Play is underway.', analyst: 'Watch the leverage and pad level here.' };
  if (cleaned.length === 1) return { pbp: cleaned[0] || 'Play is underway.', analyst: 'Good fundamentals at the point of attack.' };
  const isFormation = (s: string) => /\blines up\b/i.test(s);
  const isBookkeeping = (s: string) => /^\d+(st|nd|rd|th)\s*&|^Now\s/i.test(s);
  const notFormationOrBook = (s: string) => !(isFormation(s) || isBookkeeping(s));
  const candidates = cleaned.filter(notFormationOrBook);
  const actionRe = /(drops back|throws|pass|button hook|slant|sideline|down and in|down and out|pop pass|flair|flare|screen|bomb|keeper|sneak|draw|trap|toss|sweep|handoff|fumbled|intercepted|sacked|return|pylon|toe-?tap|first down|loss of|gain of|pressure|hits|seam shot|deep post|post|corner)/i;
  const defenseRe = /(blitz|goal[- ]?line|prevent|nickel|coverage|box|pad level|leverage|midfield|red zone|goal to go|backed up|short[- ]?yardage|crowds the line|balanced)/i;
  const pbp = (candidates.find((s) => actionRe.test(s)) || candidates[0] || cleaned.find(notFormationOrBook) || cleaned[0] || 'Play is underway.');
  let analyst = candidates.find((s) => s !== pbp && (defenseRe.test(s) || /first down|now \d+(st|nd|rd|th)/i.test(s)))
    || cleaned.find((s) => s !== pbp && notFormationOrBook(s))
    || cleaned.find((s) => s !== pbp)
    || 'Good fundamentals at the point of attack.';
  return { pbp, analyst };
}

export function buildBroadcastCall(
  pre: GameState,
  next: GameState,
  input: PlayInput,
  outcome: Outcome | undefined,
  deps: {
    rng: RNG;
    playInDrive: number;
    formatClock: (n: number) => string;
    formatOrdinal: (n: number) => string;
    formatTeamYardLine: (possessing: TeamSide, ballOn: number) => string;
    formatPossessionSpotForBroadcast: (possessing: TeamSide, ballOn: number) => string;
    quarterStats: { explosives: number; turnovers: number };
  }
): { pbp: string; analyst: string } {
  const downText = pre.down === 1 ? 'First and 10' : (pre.down === 2 ? `Second and ${pre.toGo}` : (pre.down === 3 ? `Third and ${pre.toGo}` : `Fourth and ${pre.toGo}`));
  const spotPhrase = deps.formatPossessionSpotForBroadcast(pre.possession, pre.ballOn);
  const def = String(input.defenseLabel || '');
  const off = String(input.playLabel || '');
  const clock = deps.formatClock(pre.clock);
  const scoreText = `HOME ${pre.score.player} – AWAY ${pre.score.ai}`;
  const hash = ((): string => {
    const mod = pre.ballOn % 3; if (mod === 0) return 'left hash'; if (mod === 1) return 'right hash'; return 'between the hashes';
  })();
  const numbersSide = ((): string => {
    const mod = pre.ballOn % 2; return mod === 0 ? 'near side numbers' : 'far side numbers';
  })();

  const formation = ((): string => {
    if (/shotgun|down &|bomb|screen|sideline|button|look in|pop pass|flair|flare/i.test(off)) return 'shotgun, three wide';
    if (/keeper|sneak|short yard|goal line|off tackle|slant run|trap|draw/i.test(off)) return 'under center, I-formation';
    return 'balanced set';
  })();
  const defLook = ((): string => {
    if (/outside blitz|inside blitz/i.test(def)) return 'blitz look';
    if (/passing/i.test(def)) return 'nickel shell, two-high safeties';
    if (/prevent_deep/i.test(def)) return 'prevent, safeties deep';
    if (/goal line|short yard/i.test(def)) return 'heavy front, stacked box';
    return 'balanced front';
  })();
  const motion = ((): string => {
    if (/sideline|down & out|down & in|screen|flair|flare|button/i.test(off)) return 'slot in short motion';
    return '';
  })();
  const isRun = /run|keeper|draw|trap|sneak|slant|off tackle|end run|reverse|razzle|power up middle/i.test(off) && !/pass/i.test(off);
  const isPass = /pass|hook|look in|sideline|flair|flare|screen|down &/i.test(off);
  const action = isRun
    ? (/end run/i.test(off) ? 'hands it off around the edge.'
      : (/off tackle/i.test(off) ? 'hands it off off tackle.'
        : (/keeper|sneak|qb/i.test(off) ? 'keeps it himself.' : 'turns and hands it off up the middle.')))
    : (isPass ? 'drops back and fires.' : 'gets it out quickly.');
  let resultPart = '';
  if (!outcome) {
    resultPart = '';
  } else if (outcome.category === 'incomplete') {
    resultPart = ' Incomplete.';
  } else if (outcome.category === 'gain' || outcome.category === 'loss') {
    const y = outcome.yards || 0;
    if (y > 0) {
      const runPhrases = [' slips through left guard.',' dives into the pile.',' cuts back against pursuit.',' bounces outside.',' spins forward.'];
      const passPhrases = [' quick hitter underneath.',' slant left, caught.',' button hook at the sticks.',' out to the flat.',' screen forms.'];
      const pick = <T>(arr: T[]): T => arr[Math.floor((deps.rng() * arr.length))]!;
      const tail = isRun ? pick(runPhrases) : pick(passPhrases);
      resultPart = `${tail} Gain of ${y}.`;
      if (y >= 20) { try { deps.quarterStats.explosives += 1; } catch {}
      }
    } else if (y < 0) resultPart = ` Swallowed up for ${Math.abs(y)}.`;
    else resultPart = ' Stonewalled at the line.';
  } else if (outcome.category === 'fumble') {
    resultPart = ' Ball is loose and recovered.';
    try { deps.quarterStats.turnovers += 1; } catch {}
  } else if (outcome.category === 'interception') {
    resultPart = ' Picked off!';
    try { deps.quarterStats.turnovers += 1; } catch {}
  }
  const preamble = `${downText}, ${deps.formatTeamYardLine(pre.possession, pre.ballOn)}, Q${pre.quarter} ${clock} — ${scoreText}`;
  const offenseTeam = (pre.possession === 'player') ? 'HOME' : 'AWAY';
  const opener = ((): string => {
    const choices = ['Here we go —','They set —','Quick to the line —','They take their time —','Snap comes —','Ball is snapped —','Here’s the play —','They roll it out —'];
    return choices[Math.floor(deps.rng() * choices.length)]!;
  })();
  const presnap = `${offenseTeam} ${deps.playInDrive > 1 ? 'sets' : 'breaks the huddle'} on the ${hash}, ${formation}. Defense shows ${defLook}${motion ? `, ${motion}` : ''}.`;
  const snap = `${opener} quarterback ${action}${resultPart}`;
  const nextDownText = `${deps.formatOrdinal(next.down)} & ${next.toGo}`;
  const nextSpot = deps.formatTeamYardLine(next.possession, next.ballOn);
  const geo = ((): string => {
    const yardsToGoal = (next.possession === 'player') ? (100 - next.ballOn) : next.ballOn;
    if (yardsToGoal <= 20) return 'inside the red zone';
    if (next.ballOn >= 48 && next.ballOn <= 52) return 'just shy of midfield';
    return `${numbersSide}`;
  })();
  const reset = `Spotted ${geo} at ${nextSpot}. ${nextDownText}.`;
  const late = (pre.quarter === 2 || pre.quarter === 4) && pre.clock <= 120;
  const pressure = late ? (pre.clock < 60 ? ' They’re hurrying now — under a minute left.' : ' Gotta get this snapped before the clock burns.') : '';
  const crowd = ((): string => {
    if (!outcome) return '';
    if (outcome.category === 'interception' || outcome.category === 'fumble') {
      return next.possession === 'player' ? ' And the crowd erupts!' : ' A hush falls over the stadium.';
    }
    return '';
  })();
  const concise = deps.rng() < 0.35;
  const pbp = (concise
    ? `${downText} at ${deps.formatTeamYardLine(pre.possession, pre.ballOn)}… ${snap} ${reset}${pressure}${crowd}`
    : `${downText} from ${spotPhrase}, Q${pre.quarter} ${clock} — ${scoreText}. ${presnap} ${snap} ${reset}${pressure}${crowd}`
  ).trim();

  let analyst = '';
  if (outcome && (outcome.category === 'gain' || outcome.category === 'loss')) {
    const y = outcome.yards || 0;
    if (y >= 8) analyst = isRun ? 'Great cut and second-level block opened that lane.' : 'Beat the leverage outside — timing was perfect.';
    else if (y >= 3) analyst = isRun ? 'Good pad level; fell forward behind the guard.' : 'On time and on target; easy yards.';
    else if (y > 0) analyst = isRun ? 'Patient run, but backers closed fast.' : 'Checkdown; kept it ahead of the sticks.';
    else if (y === 0) analyst = 'Front won at the snap — no movement.';
    else analyst = 'That was a brick wall up front; linebackers filled every crease.';
  }
  if (!analyst) {
    if (/outside blitz/i.test(def)) analyst = 'Edge pressure; QB had to speed it up.';
    else if (/inside blitz/i.test(def)) analyst = 'A-gap heat — protection slid late.';
    else if (/goal line|short yard/i.test(def)) analyst = 'Heavy front, gaps corked.';
    else if (/passing/i.test(def)) analyst = 'Light box with umbrella coverage.';
    else if (/prevent/i.test(def)) analyst = 'Soft shell, keep-it-in-front spacing.';
    else analyst = isRun ? 'Line got just enough push.' : 'Protection held just long enough.';
  }
  try {
    const lastTwo = deps.playInDrive >= 2 ? deps.playInDrive : 0;
    if (lastTwo >= 2 && isRun) analyst += ' They’ve hit that off-tackle twice; don’t be shocked if they fake it next series.';
  } catch {}
  return { pbp, analyst };
}


