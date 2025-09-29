// Placeholder for refactored resolvePlay logic.
// We'll port from main.js deterministically in subsequent steps.
export interface Card {
  id: string;
  label: string;
  type: 'run' | 'pass' | 'punt' | 'field-goal';
}

export interface PlayOutcome {
  yards: number;
  turnover: boolean;
}

export function resolvePlayStub(offense: Card, defense: Card): PlayOutcome {
  return { yards: 0, turnover: false };
}


