/**
 * Guardrails.ts - GDD distribution requirements and balance constants
 *
 * Defines acceptable ranges for game balance metrics based on NFL analytics
 * and the Gridiron Strategy design requirements.
 */

export interface BalanceGuardrail {
  name: string;
  description: string;
  min: number;
  max: number;
  unit: string;
  source: string;
  expected?: { min: number; max: number };
}

/**
 * NFL Analytics-based guardrails for realistic football simulation
 * Based on GDD Section 13.7 "Game Balance Metrics"
 */
export const BALANCE_GUARDRAILS: Record<string, BalanceGuardrail> = {
  // Explosive pass rate: 15-25% of completions (20+ yard gains)
  explosivePassRate: {
    name: 'Explosive Pass Rate',
    description: 'Percentage of pass completions that gain 20+ yards',
    min: 15,
    max: 25,
    unit: 'percentage',
    source: 'NFL Analytics - Explosive plays drive scoring'
  },

  // Sack rate: 4-8% of dropbacks
  sackRate: {
    name: 'Sack Rate',
    description: 'Percentage of dropbacks that result in sacks',
    min: 4,
    max: 8,
    unit: 'percentage',
    source: 'NFL Analytics - Realistic pressure rates'
  },

  // Deep attempt rate: 8-15% of passes
  deepAttemptRate: {
    name: 'Deep Attempt Rate',
    description: 'Percentage of passes that are deep attempts (20+ yards)',
    min: 8,
    max: 15,
    unit: 'percentage',
    source: 'NFL Analytics - Realistic deep ball frequency'
  },

  // Turnover rate per drive: 10-20%
  turnoverRate: {
    name: 'Turnover Rate',
    description: 'Percentage of drives ending in turnovers',
    min: 10,
    max: 20,
    unit: 'percentage',
    source: 'NFL Analytics - Realistic turnover frequency'
  },

  // Run/pass mix for Smashmouth: 40-60% run
  smashmouthRunRate: {
    name: 'Smashmouth Run Rate',
    description: 'Percentage of Smashmouth plays that are runs',
    min: 40,
    max: 60,
    unit: 'percentage',
    source: 'Smashmouth Playbook - Ground and pound identity'
  },

  // Run/pass mix for Air Raid: 60-80% pass
  airRaidPassRate: {
    name: 'Air Raid Pass Rate',
    description: 'Percentage of Air Raid plays that are passes',
    min: 60,
    max: 80,
    unit: 'percentage',
    source: 'Air Raid Playbook - Vertical passing attack'
  },

  // Clock runoff distribution - should be balanced across 10"/20"/30"
  clockRunoffBalance: {
    name: 'Clock Runoff Balance',
    description: 'Distribution of clock runoff times (10/20/30 seconds)',
    min: 25,
    max: 40,
    unit: 'percentage',
    source: 'NFL Analytics - Realistic play duration mix'
  },

  // Field position efficiency - scoring rate by field zone
  redZoneEfficiency: {
    name: 'Red Zone Efficiency',
    description: 'Scoring rate when inside opponent 20-yard line',
    min: 70,
    max: 85,
    unit: 'percentage',
    source: 'NFL Analytics - Realistic red zone conversion'
  },

  // Penalty rate - should be reasonable but not excessive
  penaltyRate: {
    name: 'Penalty Rate',
    description: 'Percentage of plays with penalties',
    min: 8,
    max: 15,
    unit: 'percentage',
    source: 'NFL Analytics - Realistic penalty frequency'
  }
};

/**
 * Outcome distribution shape requirements
 * Based on GDD "Clumpy Shapes" philosophy
 */
export const DISTRIBUTION_GUARDRAILS = {
  // Explosive gains should cluster around specific thresholds
  explosiveClustering: {
    name: 'Explosive Outcome Clustering',
    description: 'Explosive gains should cluster at realistic thresholds',
    thresholds: [20, 25, 30, 35, 40, 45, 50, 60, 70, 80],
    tolerance: 0.15, // 15% variance allowed
    source: 'NFL Analytics - Explosive plays follow distance patterns'
  },

  // Run game consistency - should have modest but consistent gains
  runConsistency: {
    name: 'Run Game Consistency',
    description: 'Run plays should show consistent but modest gains',
    avgGain: { min: 3.5, max: 5.5 },
    stdDev: { min: 2.0, max: 4.0 },
    source: 'NFL Analytics - Ground game efficiency'
  },

  // Pass game volatility - should show boom-bust characteristics
  passVolatility: {
    name: 'Pass Game Volatility',
    description: 'Pass plays should show higher volatility than runs',
    stdDevRatio: { min: 1.3, max: 2.0 }, // Pass std dev should be 1.3-2x run std dev
    source: 'NFL Analytics - Passing game variance'
  }
} as const;

/**
 * Playbook identity guardrails
 * Ensures each playbook maintains its strategic identity
 */
export const PLAYBOOK_IDENTITY_GUARDRAILS = {
  'West Coast': {
    passRate: { min: 65, max: 80 },
    avgGain: { min: 6.0, max: 9.0 },
    explosiveRate: { min: 12, max: 20 },
    description: 'Rhythm, timing, YAC focus with balanced attack'
  },
  'Spread': {
    passRate: { min: 55, max: 75 },
    avgGain: { min: 7.0, max: 10.0 },
    explosiveRate: { min: 15, max: 25 },
    description: 'Spacing, tempo, mismatches with creative plays'
  },
  'Air Raid': {
    passRate: { min: 70, max: 85 },
    avgGain: { min: 8.0, max: 12.0 },
    explosiveRate: { min: 20, max: 30 },
    description: 'Vertical volume, deep seams with high risk-reward'
  },
  'Smashmouth': {
    passRate: { min: 25, max: 45 },
    avgGain: { min: 4.5, max: 7.0 },
    explosiveRate: { min: 8, max: 15 },
    description: 'Downhill, clock drain with power running focus'
  },
  'Wide Zone': {
    passRate: { min: 35, max: 55 },
    avgGain: { min: 5.5, max: 8.5 },
    explosiveRate: { min: 10, max: 18 },
    description: 'Zone & boots with motion and play-action'
  }
} as const;

/**
 * Statistical confidence thresholds for analysis
 */
export const STATISTICAL_THRESHOLDS = {
  // Minimum sample size for reliable analysis
  minSampleSize: 1000,

  // Confidence level for statistical tests (95%)
  confidenceLevel: 0.95,

  // Maximum standard error for percentage metrics
  maxStandardError: 0.02,

  // Minimum effect size to flag as significant
  minEffectSize: 0.05
} as const;

/**
 * Performance requirements for balance analysis
 */
export const PERFORMANCE_REQUIREMENTS = {
  // Maximum time for full analysis of all tables
  maxAnalysisTime: 30 * 1000, // 30 seconds

  // Maximum time per table analysis
  maxPerTableTime: 5 * 1000, // 5 seconds

  // Maximum memory usage during analysis
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
} as const;
