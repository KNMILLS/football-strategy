// Core AI exports (existing)
export { COACH_PROFILES } from './CoachProfiles';
export type { CoachProfile } from './CoachProfiles';
export { PlayCaller } from './PlayCaller';
export type { OffenseCall, DefenseCall, PersonalityConfig, PlayCallerDeps } from './PlayCaller';
export { OpponentModel } from './OpponentModel';
export type { PlayerTendenciesMemory } from './types';

// Dice-aware AI system (new)
export { EVCalculator } from './dice/EVCalculator';
export type { EVResult, PlayCandidate, EVContext } from './dice/EVCalculator';
export { defaultScorePosition, defaultFieldPositionValue } from './dice/EVCalculator';

export { PenaltyAdvisor } from './dice/PenaltyAdvisor';
export type { PenaltyDecision, PenaltyContext } from './dice/PenaltyAdvisor';

export { TendencyTracker } from './dice/TendencyTracker';
export type { OutcomePattern, SituationTendency, PlaybookTendencyCategory, DefensiveTendencyCategory } from './dice/TendencyTracker';

export { PlaybookCoach } from './dice/PlaybookCoach';
export type { PlayCandidate as CoachPlayCandidate, DefenseCandidate } from './dice/PlaybookCoach';

export { DecisionValidator } from './dice/DecisionValidator';
export type { ValidationResult, DecisionContext } from './dice/DecisionValidator';

// Re-export types from dice system
export type { PlaybookName, DefensivePlay, PlaybookCard } from '../types/dice';
