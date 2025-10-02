export const COACH_PROFILES = {
    'Andy Reid': {
        name: 'Andy Reid',
        aggression: 0.9,
        fourthDownBoost: 0.15,
        passBias: 0.15,
        twoPointAggressiveLate: true,
        onsideAggressive: true,
        // Aggressive playbook preferences - favors explosive passing attacks
        playbookPreferences: {
            'West Coast': 0.7, // Balanced but pass-oriented
            'Spread': 0.9, // High tempo, explosive
            'Air Raid': 0.95, // Maximum aggression, deep shots
            'Smashmouth': 0.4, // Conservative ground game
            'Wide Zone': 0.8 // Zone running with play action
        },
        riskTolerance: 0.8, // High risk tolerance - willing to go for big plays
        clockManagementAggression: 0.9 // Very aggressive clock management
    },
    'John Madden': {
        name: 'John Madden',
        aggression: 0.6,
        fourthDownBoost: 0.08,
        passBias: 0.05,
        twoPointAggressiveLate: false,
        onsideAggressive: false,
        // Balanced playbook preferences - traditional football
        playbookPreferences: {
            'West Coast': 0.8, // Classic balanced offense
            'Spread': 0.6, // Moderate tempo
            'Air Raid': 0.3, // Conservative on deep shots
            'Smashmouth': 0.9, // Strong running game focus
            'Wide Zone': 0.7 // Zone scheme with balance
        },
        riskTolerance: 0.5, // Moderate risk tolerance
        clockManagementAggression: 0.5 // Balanced clock management
    },
    'Bill Belichick': {
        name: 'Bill Belichick',
        aggression: 0.35,
        fourthDownBoost: 0.0,
        passBias: -0.05,
        twoPointAggressiveLate: false,
        onsideAggressive: false,
        // Conservative playbook preferences - situational football
        playbookPreferences: {
            'West Coast': 0.9, // Efficient, low-risk passing
            'Spread': 0.3, // Conservative tempo
            'Air Raid': 0.1, // Minimal deep shots
            'Smashmouth': 0.8, // Strong running focus
            'Wide Zone': 0.6 // Zone running for efficiency
        },
        riskTolerance: 0.2, // Low risk tolerance - conservative decisions
        clockManagementAggression: 0.3 // Conservative clock management
    },
};
//# sourceMappingURL=CoachProfiles.js.map