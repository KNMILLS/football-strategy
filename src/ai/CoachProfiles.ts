import type { PlaybookName } from '../types/dice';

export interface CoachProfile {
  name: string;
  aggression: number;
  fourthDownBoost: number;
  passBias: number; // positive => pass leaning, negative => run leaning
  twoPointAggressiveLate: boolean;
  onsideAggressive: boolean;
  // New playbook system preferences
  playbookPreferences: Record<PlaybookName, number>; // 0-1 preference weights
  riskTolerance: number; // How willing to take risks with EV calculations
  clockManagementAggression: number; // How aggressive with clock in late game
}

export const COACH_PROFILES: Record<string, CoachProfile> = {
  'Andy Reid': {
    name: 'Andy Reid',
    aggression: 0.9,
    fourthDownBoost: 0.15,
    passBias: 0.15,
    twoPointAggressiveLate: true,
    onsideAggressive: true,
    // Reid → Air Raid/Spread bias (as per Phase C requirements)
    playbookPreferences: {
      'West Coast': 0.6,    // Secondary option
      'Spread': 0.95,       // Primary - high tempo, explosive
      'Air Raid': 0.9,      // Primary - deep shots, aggression
      'Smashmouth': 0.3,    // Minimal ground game focus
      'Wide Zone': 0.7      // Secondary zone option
    },
    riskTolerance: 0.8,    // High risk tolerance - willing to go for big plays
    clockManagementAggression: 0.9  // Very aggressive clock management
  },
  'John Madden': {
    name: 'John Madden',
    aggression: 0.6,
    fourthDownBoost: 0.08,
    passBias: 0.05,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
    // Madden → West Coast/Smashmouth balance (as per Phase C requirements)
    playbookPreferences: {
      'West Coast': 0.9,    // Primary - classic balanced offense
      'Spread': 0.5,        // Moderate tempo
      'Air Raid': 0.4,      // Conservative on deep shots
      'Smashmouth': 0.85,   // Primary - strong running game focus
      'Wide Zone': 0.8      // Secondary zone scheme with balance
    },
    riskTolerance: 0.5,    // Moderate risk tolerance
    clockManagementAggression: 0.5  // Balanced clock management
  },
  'Bill Belichick': {
    name: 'Bill Belichick',
    aggression: 0.35,
    fourthDownBoost: 0.0,
    passBias: -0.05,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
    // Belichick → Wide Zone/Smashmouth bias (as per Phase C requirements)
    playbookPreferences: {
      'West Coast': 0.8,    // Primary - efficient, low-risk passing
      'Spread': 0.2,        // Minimal tempo
      'Air Raid': 0.1,      // Minimal deep shots
      'Smashmouth': 0.9,    // Primary - strong running focus
      'Wide Zone': 0.95     // Primary - zone running for efficiency
    },
    riskTolerance: 0.2,    // Low risk tolerance - conservative decisions
    clockManagementAggression: 0.3  // Conservative clock management
  },
};
