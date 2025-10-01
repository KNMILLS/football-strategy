import type { OffenseCharts } from '../../data/schemas/OffenseCharts';
import type { TimeKeeping } from '../../data/schemas/Timekeeping';
import type { DeckName } from '../../data/decks';
import * as CoachProfiles from '../../ai/CoachProfiles';

export type PlayerPAT = 'auto'|'kick'|'two';

export interface RunMessage {
  type: 'run';
  seeds: number[];
  playerPAT: PlayerPAT;
  chunkSize?: number;
  // Optional: preloaded data from main thread
  charts?: OffenseCharts | null;
  tk?: TimeKeeping | null;
  playerDeck?: DeckName;
  aiDeck?: DeckName;
  playerCoach?: keyof typeof CoachProfiles;
  aiCoach?: keyof typeof CoachProfiles;
}

export interface CancelMessage { type: 'cancel' }

export type InMessage = RunMessage | CancelMessage;

export interface ProgressMessage {
  kind: 'progress';
  done: number;
  total: number;
  passed: number;
  failed: number;
}

export interface FailuresMessage {
  kind: 'failures';
  failures: Array<{ seed: number; issues: string[] }>;
}

export interface DoneMessage {
  kind: 'done';
  summary: { total: number; passed: number; failed: number; avgHome: number; avgAway: number };
  failures: Array<{ seed: number; issues: string[] }>;
}



