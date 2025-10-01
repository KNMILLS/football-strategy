import type { PlaybookCard, DefensiveCard, DiceResolutionResult, PenaltyChoice } from '../../types/dice';

// Re-export for convenience
export type { DiceResolutionResult, PenaltyChoice } from '../../types/dice';

// UI-specific card interfaces for button-based rendering
export interface ButtonCard extends PlaybookCard {
  // Button-specific properties
  isSelected?: boolean;
  isDisabled?: boolean;
  isHovered?: boolean;
  // Accessibility properties
  ariaLabel?: string;
  // Styling properties
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

// Defensive card interface for button rendering
export interface ButtonDefensiveCard extends DefensiveCard {
  // Button-specific properties
  isSelected?: boolean;
  isDisabled?: boolean;
  isHovered?: boolean;
  // Accessibility properties
  ariaLabel?: string;
  // Styling properties
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

// Playbook selection state
export interface PlaybookSelectionState {
  selectedPlaybook?: string;
  availablePlaybooks: string[];
  cards: ButtonCard[];
}

// Defensive deck selection state
export interface DefensiveSelectionState {
  selectedCards: string[];
  availableCards: ButtonDefensiveCard[];
  maxSelections: number;
}

// Penalty modal state
export interface PenaltyModalState {
  isVisible: boolean;
  penaltyInfo?: DiceResolutionResult['penalty'];
  choice?: PenaltyChoice;
  isAccepting: boolean;
  isDeclining: boolean;
}

// Result display state
export interface ResultDisplayState {
  isVisible: boolean;
  diceResult?: {
    d1: number;
    d2: number;
    sum: number;
    isDoubles: boolean;
  };
  outcome?: DiceResolutionResult;
  showAnimation?: boolean;
  animationPhase?: 'dice-roll' | 'result' | 'complete';
}

// Main dice UI state
export interface DiceUIState {
  playbook: PlaybookSelectionState;
  defensive: DefensiveSelectionState;
  penalty: PenaltyModalState;
  result: ResultDisplayState;
  isPlayerOffense: boolean;
}

// Event types for dice UI
export type DiceUIEvent =
  | { type: 'PLAYBOOK_SELECTED'; playbook: string }
  | { type: 'CARD_SELECTED'; cardId: string }
  | { type: 'DEFENSIVE_CARD_TOGGLED'; cardId: string }
  | { type: 'PENALTY_DECISION'; decision: 'accept' | 'decline' }
  | { type: 'RESULT_DISPLAY_SHOWN'; result: DiceResolutionResult }
  | { type: 'RESULT_DISPLAY_HIDDEN' }
  | { type: 'UI_RESET' };

// Accessibility configuration
export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  enableFocusManagement: boolean;
  announceResults: boolean;
  announceCardSelections: boolean;
}

// Performance configuration
export interface PerformanceConfig {
  animationDuration: number;
  debounceMs: number;
  maxConcurrentAnimations: number;
  enableHardwareAcceleration: boolean;
}

// UI configuration
export interface DiceUIConfig {
  accessibility: AccessibilityConfig;
  performance: PerformanceConfig;
  theme: 'light' | 'dark' | 'auto';
  animations: boolean;
  soundEffects: boolean;
}
