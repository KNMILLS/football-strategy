import type { GameState, TeamSide } from '../../domain/GameState';
import type { RNG } from '../../sim/RNG';
import type { FlowEvent } from '../types';

export class DriveTracker {
  private driveId = 1;
  private playInDrive = 0;
  private currentPossession: TeamSide | null = null;
  private driveStartAbsBallOn: number | null = null;
  private driveStartSide: TeamSide | null = null;
  private driveStats: { runPlays: number; passPlays: number; totalYards: number; explosives: number; sacks: number } = { runPlays: 0, passPlays: 0, totalYards: 0, explosives: 0, sacks: 0 };
  private quarterStats: { quarter: number; runs: number; passes: number; pointsHome: number; pointsAway: number; explosives: number; turnovers: number } = { quarter: 1, runs: 0, passes: 0, pointsHome: 0, pointsAway: 0, explosives: 0, turnovers: 0 };
  private weather: { temp: string; wind: string; precip: string };
  private lullThreeAndOutStreak = 0;
  private lastNotesBySide: Record<TeamSide, { zone: string | null; fgInRange: boolean; defense: string | null }> = {
    player: { zone: null, fgInRange: false, defense: null },
    ai: { zone: null, fgInRange: false, defense: null },
  };

  constructor(private rng: RNG) {
    const pick = <T>(arr: T[]): T => arr[Math.floor(((this.rng?.() || Math.random())) * arr.length)]!;
    this.weather = {
      temp: pick(['crisp','mild','warm','hot']),
      wind: pick(['calm','light breeze','gusty','quartering wind']),
      precip: pick(['clear','overcast','light rain','light snow']),
    };
  }

  getPlayInDrive(): number { return this.playInDrive; }
  getQuarterStatsRef() { return this.quarterStats; }
  getLastNotesForSide(side: TeamSide) { return this.lastNotesBySide[side]; }
  setLastNotesForSide(side: TeamSide, val: { zone: string | null; fgInRange: boolean; defense: string | null }) { this.lastNotesBySide[side] = val; }
  incrementRunOrPassByLabel(playLabel: string): void {
    try {
      const label = String(playLabel || '').toLowerCase();
      const isRun = /run|keeper|draw|trap|sneak|slant|off tackle|end run|razzle/.test(label) && !/pass/.test(label);
      if (isRun) this.quarterStats.runs += 1; else this.quarterStats.passes += 1;
    } catch {}
  }
  beginDriveIfNeeded(state: GameState, events: FlowEvent[], formatTeamYardLine: (possessing: TeamSide, ballOn: number) => string): void {
    if (this.currentPossession !== state.possession) {
      if (this.playInDrive > 0) this.driveId += 1;
      this.playInDrive = 0;
      this.currentPossession = state.possession;
      this.driveStartAbsBallOn = state.ballOn;
      this.driveStartSide = state.possession;
      this.driveStats = { runPlays: 0, passPlays: 0, totalYards: 0, explosives: 0, sacks: 0 };
      const yard = formatTeamYardLine(state.possession, state.ballOn);
      const offense = (state.possession === 'player') ? 'HOME' : 'AWAY';
      const abs = state.ballOn;
      const goodField = (state.possession === 'player') ? (abs >= 60) : (abs <= 40);
      const backed = (state.possession === 'player') ? (abs <= 15) : (abs >= 85);
      const rob = backed ? 'Backed up deep — protection and ball security matter here.'
        : goodField ? 'Short field — everything in the playbook is available.'
        : 'Solid field position to start the drive.';
      events.push({ type: 'log', message: `Brad: ${offense} takes over at ${yard}.` });
      events.push({ type: 'log', message: `Rob: ${rob}` });
    }
  }
  incrementPlayInDrive(): void { this.playInDrive += 1; }

  endDriveSummaryIfAny(state: GameState, events: FlowEvent[], reason: string): void {
    if (this.driveStartAbsBallOn != null && this.driveStartSide != null) {
      const plays = this.playInDrive;
      const gained = this.driveStats.totalYards;
      const theme = this.driveStats.runPlays > this.driveStats.passPlays ? 'ground-heavy' : (this.driveStats.passPlays > this.driveStats.runPlays ? 'air-heavy' : 'balanced');
      const team = (this.driveStartSide === 'player') ? 'HOME' : 'AWAY';
      const quickStrike = (plays <= 3 && gained >= 30) || this.driveStats.explosives >= 1;
      const grinding = plays >= 8 && gained >= 30;
      let brad = '';
      if (reason === 'touchdown') {
        brad = quickStrike
          ? `Three plays, quick strike — all chunk yardage — and ${team} cashes in.`
          : (grinding ? `Ten-play, grinding march — they owned the trenches — and ${team} finishes.` : `Drive wraps touchdown — ${plays} plays for ${Math.abs(gained)}.`);
      } else if (reason === 'punt') {
        brad = (plays <= 3) ? `${team} goes three-and-out — momentum drifting the other way.` : `Stalled after ${plays} plays — punt coming.`;
      } else if (reason === 'downs') {
        brad = `Stuffed on downs — ${team} turned away.`;
      } else if (reason === 'safety') {
        brad = `Safety ends it — costly series for ${team}.`;
      } else {
        brad = `Drive wraps ${reason} — ${plays} plays, ${Math.abs(gained)} yards ${gained >= 0 ? 'gained' : 'lost'}.`;
      }
      const rob = ((): string => {
        if (reason === 'touchdown') return grinding ? 'They leaned on them — pure power football.' : (quickStrike ? 'Scheme beat leverage — that flipped the field.' : 'Execution at the key moments.');
        if (reason === 'safety') return 'Protection broke down; all the juice flips sideline.';
        if (reason === 'downs') return 'That front dominated gaps — nowhere to go.';
        if (reason === 'punt') return `${theme} looks, but no finish.`;
        return `${theme} sequence.`;
      })();
      events.push({ type: 'log', message: `Brad: ${brad}` });
      events.push({ type: 'log', message: `Rob: ${rob}` });

      try {
        const threeAndOut = reason === 'punt' && plays <= 3 && gained < 5;
        if (threeAndOut) this.lullThreeAndOutStreak += 1; else this.lullThreeAndOutStreak = 0;
        if (this.lullThreeAndOutStreak >= 2) {
          const wx = this.weather;
          const wxLine = (wx.precip !== 'clear')
            ? `Weather note — ${wx.precip}, ${wx.wind}.`
            : (wx.wind !== 'calm' ? `Wind note — ${wx.wind}, ball hanging a bit.` : `Crowd is restless; waiting for a spark.`);
          const fatigue = (this.driveStats.runPlays + this.driveStats.passPlays) >= 8 ? 'Big bodies leaning — fatigue creeping in.' : 'Front sevens fresh, but they’re grinding.';
          events.push({ type: 'log', message: `Brad: ${wxLine}` });
          events.push({ type: 'log', message: `Rob: ${fatigue}` });
          this.lullThreeAndOutStreak = 0;
        }
      } catch {}
    }
  }
}


