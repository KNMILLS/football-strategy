import type { DiceOutcome, DoublesOutcome, PenaltyTable } from '../data/schemas/MatchupTable';

// Core dice resolution types
export interface DiceRoll {
  d1: number;
  d2: number;
  sum: number;
  isDoubles: boolean;
}

// Playbook card definitions for new system
export interface PlaybookCard {
  id: string;
  playbook: PlaybookName;
  label: string;
  type: CardType;
  description?: string;
}

export type PlaybookName = 'West Coast' | 'Spread' | 'Air Raid' | 'Smashmouth' | 'Wide Zone';

export type CardType = 'run' | 'pass' | 'punt' | 'field-goal';

// Defensive card for universal deck
export interface DefensiveCard {
  id: string;
  label: DefensivePlay;
}

export type DefensivePlay =
  | 'Goal Line'
  | 'All-Out Blitz'
  | 'Inside Blitz'
  | 'Outside Blitz'
  | 'Cover 1'
  | 'Cover 2'
  | 'Cover 3'
  | 'Cover 4'
  | 'Cover 6'
  | 'Prevent';

// Resolution result from dice system
export interface DiceResolutionResult {
  // Base outcome (before penalty consideration)
  baseOutcome: DiceOutcome;
  // Penalty information (if doubles 2-19)
  penalty?: {
    roll: number; // d10 roll result
    penaltyInfo: PenaltyTable['entries'][number];
    options: {
      accept: () => void;
      decline: () => void;
    };
  };
  // Doubles result (1-1 or 20-20)
  doubles?: DoublesOutcome;
  // Clock runoff in seconds
  clockRunoff: 10 | 20 | 30;
  // Tags for UI and commentary
  tags: string[];
}

// Enhanced game state for dice system
export interface DiceGameState {
  // ... existing GameState fields
  currentPlaybook?: PlaybookName;
  diceResult?: DiceRoll;
  pendingPenaltyChoice?: boolean;
  availablePlaybooks: PlaybookName[];
}

// Penalty choice result
export interface PenaltyChoice {
  accepted: boolean;
  finalYards: number;
  finalClock: number;
  description: string;
}
