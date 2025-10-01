import type { GameState, TeamSide } from '../../domain/GameState';
import type { Outcome } from '../../rules/ResultParsing';

export function buildResultSummary(
  pre: GameState,
  next: GameState,
  outcome: Outcome | undefined,
  flags: { td?: boolean; safety?: boolean },
  currentPlayLabel: string,
  defenseLabel: string,
  deps: {
    formatOrdinal: (n: number) => string;
    formatTeamYardLine: (possessing: TeamSide, ballOn: number) => string;
    rng: () => number;
    getLastNotesForSide: (side: TeamSide) => { zone: string | null; fgInRange: boolean; defense: string | null };
    setLastNotesForSide: (side: TeamSide, notes: { zone: string | null; fgInRange: boolean; defense: string | null }) => void;
  }
): { result: string; notes: string[] } {
  const notes: string[] = [];
  const homeAway = (side: 'player'|'ai') => (side === 'player' ? 'HOME' : 'AWAY');
  const spotText = `${homeAway(pre.possession)} ball at the ${deps.formatTeamYardLine(pre.possession, pre.ballOn)} yard line.`;
  const yardsToGoal = pre.possession === 'player' ? (100 - pre.ballOn) : pre.ballOn;
  const abs = pre.ballOn;
  const acrossMid = (pre.possession === 'player') ? abs >= 50 : abs <= 50;
  const nearMid = abs >= 45 && abs <= 55;
  const backedUp = (pre.possession === 'player') ? abs <= 10 : abs >= 90;
  let zone: string | null = null;
  if (yardsToGoal <= 10 && pre.down === 1 && pre.toGo >= yardsToGoal) zone = 'GoalToGo';
  else if (yardsToGoal <= 20) zone = 'RedZone';
  else if (nearMid) zone = 'NearMid';
  else if (acrossMid) zone = 'AcrossMid';
  else if (backedUp) zone = 'BackedUp';

  const last = deps.getLastNotesForSide(pre.possession);
  if (zone && zone !== last.zone) {
    if (zone === 'GoalToGo') notes.push('Goal to go.');
    else if (zone === 'RedZone') notes.push('Red zone opportunity.');
    else if (zone === 'NearMid') notes.push('Near midfield.');
    else if (zone === 'AcrossMid') notes.push('Across midfield.');
    else if (zone === 'BackedUp') notes.push('Backed up near own goal line.');
  }
  const attemptYards = yardsToGoal + 17;
  const inRange = attemptYards <= 45;
  if (inRange && pre.down >= 3 && !last.fgInRange) notes.push('Within field goal range.');
  notes.push(`${deps.formatOrdinal(pre.down)} & ${pre.toGo}, ${spotText}`);
  const shortYardage = pre.toGo <= 1;
  const isSneak = /sneak|qb keeper|keeper/i.test(currentPlayLabel);
  const passHeavy = /play[- ]?action|long bomb|down & in|down & out|post|corner|seam|bomb/i.test(currentPlayLabel);
  if (shortYardage || isSneak || passHeavy) {
    const offFormation = /pass|hook|look in|sideline|flare|flair|pop|bomb|button|screen|down &/i.test(currentPlayLabel) ? 'lines up in the shotgun.' : 'lines up under center.';
    notes.push(offFormation);
  }
  const playLabel = String(currentPlayLabel || '');
  const defNote = (dl: string): string | null => {
    const pick = <T>(arr: T[]): T => arr[Math.floor((deps.rng?.() || Math.random()) * arr.length)]!;
    if (/goal line/i.test(dl)) return pick(['Stacked front, safeties pinched.', 'Stacked box, gaps corked.']);
    if (/short yardage/i.test(dl)) return pick(['Tight box, gaps packed.', 'Heavy front, gaps corked.']);
    if (/passing/i.test(dl)) return pick(['Light box, two-high shell.', 'Nickel spacing, umbrella coverage.']);
    if (/outside blitz/i.test(dl)) return pick(['Corner fire off the edge.', 'Nickel off the slot.', 'Safety blitz crashing down.']);
    if (/inside blitz/i.test(dl)) return pick(['Mike shoots the A-gap.', 'Linebacker dog up the middle.']);
    if (/prevent deep/i.test(dl)) return pick(['Umbrella shell, keep it in front.', 'Prevent deep — nothing behind.']);
    if (/prevent/i.test(dl)) return 'Umbrella look, keep-it-in-front spacing.';
    if (/run & pass|pass & run|running/i.test(dl)) return pick(['Balanced shell.', 'Soft quarters, balanced spacing.']);
    return null;
  };
  const dnote = defNote(String(defenseLabel || ''));
  const lastDef = last.defense || null;
  const isBlitz = /blitz/i.test(defenseLabel || '');
  if (dnote && (isBlitz || (defenseLabel || '') !== lastDef)) notes.push(dnote);

  if (/punt/i.test(playLabel)) {
    notes.push(`${homeAway(pre.possession)} lines up to punt from the ${pre.ballOn} yard line.`);
  } else if (/pass|hook|look in|sideline|flare|flair|pop|bomb|button/i.test(playLabel)) {
    if (/screen/i.test(playLabel)) notes.push('Quarterback sets up the screen.');
    else if (/button hook/i.test(playLabel)) notes.push('Quick button hook route.');
    else if (/look in/i.test(playLabel)) notes.push('Quick slant to the inside.');
    else if (/sideline/i.test(playLabel)) notes.push('Throws to the sideline.');
    else if (/down & in/i.test(playLabel)) notes.push('Throws down and in.');
    else if (/down & out/i.test(playLabel)) notes.push('Throws down and out.');
    else if (/pop pass/i.test(playLabel)) notes.push('Quick pop pass over the middle.');
    else if (/flair|flare/i.test(playLabel)) notes.push('Flair pass to the back.');
    else if (/stop & go/i.test(playLabel)) notes.push('Stop-and-go, going deep.');
    else if (/bomb/i.test(playLabel)) notes.push('Going deep downfield.');
    else notes.push('Quarterback drops back to pass.');
  } else if (/keeper|draw|qb/i.test(playLabel)) {
    notes.push('Quarterback keeps it himself and runs.');
  } else {
    if (/end run/i.test(playLabel)) notes.push('Quarterback hands off around the end.');
    else if (/off tackle/i.test(playLabel)) notes.push('Quarterback hands off off tackle.');
    else if (/slant run/i.test(playLabel)) notes.push('Quarterback hands off on an inside slant run.');
    else if (/draw/i.test(playLabel)) notes.push('Quarterback delays and hands off on a draw play.');
    else if (/trap/i.test(playLabel)) notes.push('Quarterback hands off on a trap play.');
    else if (/run & pass option/i.test(playLabel)) notes.push('Quarterback reads the option look.');
    else if (/razzle dazzle/i.test(playLabel)) notes.push('Trick play! Razzle dazzle in the backfield.');
    else notes.push('Quarterback hands off to the running back.');
  }
  if (flags.td) {
    return { result: 'Touchdown', notes: [...notes, 'Touchdown scored.'] };
  }
  if (flags.safety) {
    return { result: 'Safety', notes: [...notes, 'Safety is awarded.'] };
  }
  if (!outcome) {
    return { result: 'Play', notes };
  }
  if (outcome.category === 'incomplete') {
    let inc = 'The pass falls incomplete.';
    if (/blitz/i.test(defenseLabel)) inc = 'Pressure forces an incomplete pass.';
    else if (/prevent deep/i.test(defenseLabel)) inc = 'Prevent deep coverage breaks up the deep shot.';
    else if (/passing/i.test(defenseLabel)) inc = 'Tight coverage, pass falls incomplete.';
    return { result: 'Incomplete', notes: [...notes, inc] };
  }
  if (outcome.category === 'gain' || outcome.category === 'loss') {
    const y = outcome.yards || 0;
    const kind = y >= 0 ? 'Gain' : 'Loss';
    const isSack = Boolean((outcome.raw && /sack/i.test(outcome.raw)) || /sack/i.test(playLabel));
    if (isSack) {
      const blitzTag = /blitz/i.test(defenseLabel) ? ' Blitz gets home.' : '';
      return { result: `Sack -${Math.abs(y)}`, notes: [...notes, `Edge wins inside spin; quarterback swallowed.${blitzTag}`, `Loss of ${Math.abs(y)} yards. Protection beaten.`, `Now ${deps.formatOrdinal(next.down)} & ${next.toGo}.`] };
    }
    const firstDownNow = (pre.possession === next.possession) && pre.down !== 1 && next.down === 1;
    const verbsGain = ['slashes for', 'rumbles for', 'bursts for', 'powers for', 'cuts for'];
    const verbsLoss = ['stacked for', 'dropped for', 'stuffed for', 'spilled for'];
    const pick = <T>(arr: T[]): T => arr[Math.floor(((deps.rng?.() || Math.random())) * arr.length)]!;
    const action = y >= 0 ? `${pick(verbsGain)} ${Math.abs(y)}.` : `${pick(verbsLoss)} ${Math.abs(y)}.`;
    const path = Math.abs(y) >= 20 ? (() => {
      const start = deps.formatTeamYardLine(pre.possession, pre.ballOn);
      const mid = pre.possession === 'player' ? (pre.ballOn + Math.floor(Math.abs(y) / 2)) : (pre.ballOn - Math.floor(Math.abs(y) / 2));
      const midText = deps.formatTeamYardLine(pre.possession, Math.max(0, Math.min(100, mid)));
      const end = deps.formatTeamYardLine(next.possession, next.ballOn);
      return `From ${start}… to ${midText}… down at ${end}!`;
    })() : '';
    const conversion = firstDownNow ? ' First down!' : '';
    return { result: `${kind} ${Math.abs(y)}`, notes: [...notes, `${action} ${path}`.trim(), `Now ${deps.formatOrdinal(next.down)} & ${next.toGo}.${conversion}`] };
  }

  deps.setLastNotesForSide(pre.possession, {
    zone: zone || deps.getLastNotesForSide(pre.possession).zone,
    fgInRange: inRange,
    defense: defenseLabel || null,
  });
  if (outcome.category === 'interception') {
    const ret = outcome.interceptReturn || 0;
    const retText = ret ? ` Return of ${Math.abs(ret)} yards.` : '';
    const endSpot = deps.formatTeamYardLine(next.possession, next.ballOn);
    return { result: 'Interception', notes: [...notes, `Ball is picked — tipped and taken.${retText}`, `${homeAway(next.possession)} takes over at the ${endSpot}.`] };
  }
  if (outcome.category === 'fumble') {
    const endSpot = deps.formatTeamYardLine(next.possession, next.ballOn);
    const looseAt = deps.formatTeamYardLine(pre.possession, pre.ballOn);
    return { result: 'Fumble', notes: [...notes, `Ball's loose at ${looseAt} — scrum on the ground.`, `Recovered by ${homeAway(next.possession)} at ${endSpot}.`] };
  }
  if (outcome.category === 'penalty') {
    const on = (outcome.penalty && outcome.penalty.on) || 'offense';
    const yards = (outcome.penalty && outcome.penalty.yards) || 0;
    return { result: `Penalty on ${on} (${yards})`, notes: [...notes, 'Penalty called.'] };
  }
  return { result: 'Play', notes };
}


