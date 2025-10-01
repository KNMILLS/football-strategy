// Core dice resolution system
export { resolveSnap, rollD20, rollD10 } from './ResolveSnap';
export type {
  DiceResolutionResult,
  DiceRoll,
  BaseOutcome,
  TurnoverInfo,
  PenaltyOutcome,
  DoublesKind
} from './DiceOutcome';

// Legacy deterministic resolver (for comparison/migration)
export { resolvePlayCore } from './ResolvePlayCore';

// Penalty administration
export { administerPenalty } from './PenaltyAdmin';
export type { PenaltyContext, AdminResult } from './PenaltyAdmin';
