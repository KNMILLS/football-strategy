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
    passBias: 0.2,
    twoPointAggressiveLate: true,
    onsideAggressive: true,
    // Reid → Spread focus (high tempo, explosive offense)
    playbookPreferences: {
      'West Coast': 0.5,    // Secondary option for balance
      'Spread': 0.95,       // Primary - high tempo, explosive
      'Air Raid': 0.8,      // Secondary - deep shots for big plays
      'Smashmouth': 0.2,    // Minimal ground game focus
      'Wide Zone': 0.6      // Some zone option for versatility
    },
    riskTolerance: 0.85,   // High risk tolerance - willing to go for big plays
    clockManagementAggression: 0.9  // Very aggressive clock management
  },
  'Bill Walsh': {
    name: 'Bill Walsh',
    aggression: 0.7,
    fourthDownBoost: 0.1,
    passBias: 0.25,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
    // Walsh → West Coast focus (timing, precision, short-to-medium passing)
    playbookPreferences: {
      'West Coast': 0.95,   // Primary - innovative, balanced passing
      'Spread': 0.7,        // Secondary tempo option
      'Air Raid': 0.3,      // Minimal deep shots
      'Smashmouth': 0.4,    // Some power running for balance
      'Wide Zone': 0.6      // Zone scheme for versatility
    },
    riskTolerance: 0.6,    // Moderate risk tolerance - calculated risks
    clockManagementAggression: 0.7  // Aggressive but smart clock management
  },
  'Kliff Kingsbury': {
    name: 'Kliff Kingsbury',
    aggression: 0.95,
    fourthDownBoost: 0.2,
    passBias: 0.35,
    twoPointAggressiveLate: true,
    onsideAggressive: true,
    // Kingsbury → Air Raid focus (aggressive downfield passing, high tempo)
    playbookPreferences: {
      'West Coast': 0.4,    // Some timing routes for balance
      'Spread': 0.9,        // High tempo spread concepts
      'Air Raid': 0.95,     // Primary - aggressive downfield passing
      'Smashmouth': 0.1,    // Minimal ground game focus
      'Wide Zone': 0.3      // Limited zone running
    },
    riskTolerance: 0.9,    // Very high risk tolerance - gunslinger mentality
    clockManagementAggression: 0.95  // Extremely aggressive clock management
  },
  'Marty Schottenheimer': {
    name: 'Marty Schottenheimer',
    aggression: 0.4,
    fourthDownBoost: 0.05,
    passBias: -0.15,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
    // Schottenheimer → Smashmouth focus (power running, conservative)
    playbookPreferences: {
      'West Coast': 0.5,    // Some play-action passing
      'Spread': 0.1,        // Minimal tempo
      'Air Raid': 0.05,     // Very conservative on deep shots
      'Smashmouth': 0.95,   // Primary - power running focus
      'Wide Zone': 0.8      // Secondary zone scheme
    },
    riskTolerance: 0.3,    // Low risk tolerance - conservative decisions
    clockManagementAggression: 0.4  // Conservative clock management
  },
  'Mike Shanahan': {
    name: 'Mike Shanahan',
    aggression: 0.6,
    fourthDownBoost: 0.08,
    passBias: 0.05,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
    // Shanahan → Wide Zone focus (innovative zone blocking, balanced)
    playbookPreferences: {
      'West Coast': 0.7,    // Play-action and timing routes
      'Spread': 0.4,        // Some spread concepts
      'Air Raid': 0.2,      // Conservative on deep shots
      'Smashmouth': 0.8,    // Power running for toughness
      'Wide Zone': 0.95     // Primary - zone blocking scheme
    },
    riskTolerance: 0.5,    // Moderate risk tolerance - smart, calculated
    clockManagementAggression: 0.6  // Balanced clock management
  },
};
