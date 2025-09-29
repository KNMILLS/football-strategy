export interface CoachProfile {
  name: string;
  aggression: number;
  fourthDownBoost: number;
  passBias: number; // positive => pass leaning, negative => run leaning
  twoPointAggressiveLate: boolean;
  onsideAggressive: boolean;
}

export const COACH_PROFILES: Record<string, CoachProfile> = {
  'Andy Reid': {
    name: 'Andy Reid',
    aggression: 0.9,
    fourthDownBoost: 0.15,
    passBias: 0.15,
    twoPointAggressiveLate: true,
    onsideAggressive: true,
  },
  'John Madden': {
    name: 'John Madden',
    aggression: 0.6,
    fourthDownBoost: 0.08,
    passBias: 0.05,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
  },
  'Bill Belichick': {
    name: 'Bill Belichick',
    aggression: 0.35,
    fourthDownBoost: 0.0,
    passBias: -0.05,
    twoPointAggressiveLate: false,
    onsideAggressive: false,
  },
};
