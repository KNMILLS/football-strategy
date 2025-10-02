import type { MatchupTable } from '../../data/schemas/MatchupTable.js';
import { BALANCE_GUARDRAILS, DISTRIBUTION_GUARDRAILS, PLAYBOOK_IDENTITY_GUARDRAILS } from '../../sim/balance/Guardrails.js';

/**
 * DistributionPreview.ts - Visualization and analysis utilities for dice table distributions
 *
 * Provides histogram generation, balance analysis, and visual feedback for table authoring.
 */

export interface DistributionBin {
  range: string;
  count: number;
  percentage: number;
  outcomes: Array<{
    sum: number;
    yards: number;
    clock: string;
    tags?: string[];
  }>;
}

export interface DistributionAnalysis {
  bins: DistributionBin[];
  statistics: {
    mean: number;
    median: number;
    mode: number[];
    stdDev: number;
    min: number;
    max: number;
    explosiveRate: number; // % of outcomes >= 20 yards
    turnoverRate: number; // % of outcomes with turnovers
    clockDistribution: Record<string, number>;
  };
  balance: {
    guardrailViolations: string[];
    playbookIdentity?: {
      matches: string[];
      suggestions: string[];
    };
    riskAssessment: 'low' | 'medium' | 'high';
  };
  visualization: {
    asciiHistogram: string;
    summary: string;
  };
}

export interface PreviewOptions {
  binSize?: number;
  showAsciiHistogram?: boolean;
  analyzeBalance?: boolean;
  detectPlaybookIdentity?: boolean;
}

/**
 * Generates a comprehensive distribution analysis for a matchup table
 */
export function analyzeDistribution(table: MatchupTable, options: PreviewOptions = {}): DistributionAnalysis {
  const {
    binSize = 5,
    showAsciiHistogram = true,
    analyzeBalance = true,
    detectPlaybookIdentity = true
  } = options;

  // Extract outcomes and calculate statistics
  const outcomes = Object.entries(table.entries).map(([sum, outcome]) => ({
    sum: parseInt(sum),
    yards: outcome.yards,
    clock: outcome.clock,
    tags: outcome.tags
  }));

  const statistics = calculateStatistics(outcomes);
  const bins = createDistributionBins(outcomes, binSize);

  // Generate balance analysis
  const balance = analyzeBalance ? analyzeTableBalance(table, outcomes, statistics) : {
    guardrailViolations: [],
    riskAssessment: 'medium' as const
  };

  // Add playbook identity detection if requested
  if (detectPlaybookIdentity) {
    const identityResult = detectPlaybookIdentityFromTable(table);
    balance.playbookIdentity = identityResult;
  }

  // Generate ASCII visualization
  const visualization = showAsciiHistogram ? generateAsciiHistogram(bins, statistics) : {
    asciiHistogram: '',
    summary: generateTextSummary(statistics, balance)
  };

  return {
    bins,
    statistics,
    balance,
    visualization
  };
}

/**
 * Calculates statistical measures for the distribution
 */
function calculateStatistics(outcomes: Array<{sum: number; yards: number; clock: string}>): DistributionAnalysis['statistics'] {
  const yards = outcomes.map(o => o.yards);
  const sortedYards = [...yards].sort((a, b) => a - b);

  // Calculate mean
  const mean = yards.reduce((sum, y) => sum + y, 0) / yards.length;

  // Calculate median
  const mid = Math.floor(sortedYards.length / 2);
  const median = sortedYards.length % 2 === 0
    ? (sortedYards[mid - 1]! + sortedYards[mid]!) / 2
    : sortedYards[mid]!;

  // Calculate mode (most frequent yardage values)
  const frequency: Record<number, number> = {};
  yards.forEach(y => frequency[y] = (frequency[y] || 0) + 1);
  const maxFreq = Math.max(...Object.values(frequency));
  const mode = Object.keys(frequency)
    .filter(y => frequency[Number(y)] === maxFreq)
    .map(Number);

  // Calculate standard deviation
  const variance = yards.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / yards.length;
  const stdDev = Math.sqrt(variance);

  // Calculate explosive rate (20+ yards)
  const explosiveOutcomes = yards.filter(y => y >= 20).length;
  const explosiveRate = (explosiveOutcomes / yards.length) * 100;

  // Calculate turnover rate (based on turnover tags or actual turnover field)
  const turnoverOutcomes = outcomes.filter(o =>
    o.tags?.some((tag: string) => tag.includes('turnover'))
  ).length;
  const turnoverRate = (turnoverOutcomes / outcomes.length) * 100;

  // Calculate clock distribution
  const clockCounts: Record<string, number> = { '10': 0, '20': 0, '30': 0 };
  outcomes.forEach(o => {
    clockCounts[o.clock] = (clockCounts[o.clock] || 0) + 1;
  });

  const totalClocks = outcomes.length;
  const clockDistribution = {
    '10': (clockCounts['10'] / totalClocks) * 100,
    '20': (clockCounts['20'] / totalClocks) * 100,
    '30': (clockCounts['30'] / totalClocks) * 100
  };

  return {
    mean,
    median,
    mode,
    stdDev,
    min: Math.min(...yards),
    max: Math.max(...yards),
    explosiveRate,
    turnoverRate,
    clockDistribution
  };
}

/**
 * Creates distribution bins for histogram visualization
 */
function createDistributionBins(outcomes: Array<{sum: number; yards: number; clock: string; tags?: string[]}>, binSize: number): DistributionBin[] {
  const yards = outcomes.map(o => o.yards);
  const minYards = Math.min(...yards);
  const maxYards = Math.max(...yards);

  // Create bins
  const bins: DistributionBin[] = [];
  for (let start = 0; start <= maxYards; start += binSize) {
    const end = Math.min(start + binSize - 1, maxYards);
    const range = `${start}-${end}`;

    const binOutcomes = outcomes.filter(o => o.yards >= start && o.yards <= end);

    bins.push({
      range,
      count: binOutcomes.length,
      percentage: (binOutcomes.length / outcomes.length) * 100,
      outcomes: binOutcomes.map(o => ({
        sum: o.sum,
        yards: o.yards,
        clock: o.clock,
        tags: o.tags || []
      }))
    });
  }

  return bins;
}

/**
 * Analyzes table balance against guardrails
 */
function analyzeTableBalance(table: MatchupTable, outcomes: Array<{sum: number; yards: number; clock: string}>, statistics: DistributionAnalysis['statistics']): DistributionAnalysis['balance'] {
  const violations: string[] = [];

  // Check explosive pass rate
  const explosiveGuardrail = BALANCE_GUARDRAILS.explosivePassRate;
  if (explosiveGuardrail && (statistics.explosiveRate < explosiveGuardrail.min || statistics.explosiveRate > explosiveGuardrail.max)) {
    violations.push(`Explosive rate ${statistics.explosiveRate.toFixed(1)}% is outside ${explosiveGuardrail.min}-${explosiveGuardrail.max}% range`);
  }

  // Check clock distribution balance
  const clockGuardrail = BALANCE_GUARDRAILS.clockRunoffBalance;
  const clockValues = Object.values(statistics.clockDistribution);
  const maxClock = Math.max(...clockValues);
  const minClock = Math.min(...clockValues);

  if (maxClock - minClock > 20) { // More than 20% difference between highest and lowest
    violations.push(`Clock distribution is unbalanced (range: ${minClock.toFixed(1)}%-${maxClock.toFixed(1)}%)`);
  }

  // Assess risk profile based on table metadata and statistics
  let riskAssessment: 'low' | 'medium' | 'high' = 'medium';

  if (table.meta.risk_profile === 'high' || statistics.stdDev > 8 || statistics.explosiveRate > 25) {
    riskAssessment = 'high';
  } else if (table.meta.risk_profile === 'low' || statistics.stdDev < 4 || statistics.explosiveRate < 15) {
    riskAssessment = 'low';
  }

  return {
    guardrailViolations: violations,
    riskAssessment
  };
}

/**
 * Attempts to detect playbook identity from table characteristics
 */
function detectPlaybookIdentityFromTable(table: MatchupTable): { matches: string[]; suggestions: string[] } {
  const matches: string[] = [];
  const suggestions: string[] = [];

  // Simple heuristic-based detection
  const avgYards = Object.values(table.entries).reduce((sum, entry) => sum + entry.yards, 0) / Object.keys(table.entries).length;
  const explosiveRate = Object.values(table.entries).filter(entry => entry.yards >= 20).length / Object.keys(table.entries).length * 100;
  const passAggression = avgYards > 6 ? 'high' : avgYards > 4 ? 'medium' : 'low';

  // Check against known playbook patterns
  for (const [playbook, identity] of Object.entries(PLAYBOOK_IDENTITY_GUARDRAILS)) {
    let score = 0;

    // Check if yardage aligns with playbook expectations
    if (avgYards >= identity.avgGain.min && avgYards <= identity.avgGain.max) {
      score += 2;
    }

    // Check explosive rate alignment
    if (explosiveRate >= identity.explosiveRate.min && explosiveRate <= identity.explosiveRate.max) {
      score += 2;
    }

    // Check risk profile alignment
    if (table.meta.risk_profile === 'high' && identity.passRate.min > 60) score += 1;
    if (table.meta.risk_profile === 'low' && identity.passRate.min < 50) score += 1;

    if (score >= 3) {
      matches.push(`${playbook} (${identity.description})`);
    } else if (score >= 1) {
      suggestions.push(`${playbook} - adjust to ${identity.avgGain.min}-${identity.avgGain.max} avg yards and ${identity.explosiveRate.min}-${identity.explosiveRate.max}% explosive rate`);
    }
  }

  return { matches, suggestions };
}

/**
 * Generates an ASCII histogram visualization
 */
function generateAsciiHistogram(bins: DistributionBin[], statistics: DistributionAnalysis['statistics']): { asciiHistogram: string; summary: string } {
  const maxCount = Math.max(...bins.map(b => b.count));
  const maxBarLength = 50;

  let histogram = '\n📊 Distribution Histogram:\n';
  histogram += 'Yards | Frequency\n';
  histogram += '------|----------\n';

  bins.forEach(bin => {
    const barLength = Math.round((bin.count / maxCount) * maxBarLength);
    const bar = '█'.repeat(barLength);
    histogram += `${bin.range.padEnd(5)} | ${bar} ${bin.count} (${bin.percentage.toFixed(1)}%)\n`;
  });

  const summary = generateTextSummary(statistics, { guardrailViolations: [], riskAssessment: 'medium' });

  return { asciiHistogram: histogram, summary };
}

/**
 * Generates a text summary of the analysis
 */
function generateTextSummary(statistics: DistributionAnalysis['statistics'], balance: DistributionAnalysis['balance']): string {
  let summary = '\n📈 Distribution Summary:\n';
  summary += `Mean: ${statistics.mean.toFixed(1)} yards\n`;
  summary += `Median: ${statistics.median.toFixed(1)} yards\n`;
  summary += `Std Dev: ${statistics.stdDev.toFixed(1)} yards\n`;
  summary += `Range: ${statistics.min}-${statistics.max} yards\n`;
  summary += `Explosive Rate: ${statistics.explosiveRate.toFixed(1)}%\n`;
  summary += `Turnover Rate: ${statistics.turnoverRate.toFixed(1)}%\n`;
  summary += `Clock Distribution: ${Object.entries(statistics.clockDistribution).map(([clock, pct]) => `${clock}s: ${pct.toFixed(1)}%`).join(', ')}\n`;

  if (balance.guardrailViolations.length > 0) {
    summary += `\n⚠️  Balance Issues:\n`;
    balance.guardrailViolations.forEach(violation => {
      summary += `  • ${violation}\n`;
    });
  }

  if (balance.playbookIdentity) {
    if (balance.playbookIdentity.matches.length > 0) {
      summary += `\n✅ Playbook Identity Match:\n`;
      balance.playbookIdentity.matches.forEach(match => {
        summary += `  • ${match}\n`;
      });
    }

    if (balance.playbookIdentity.suggestions.length > 0) {
      summary += `\n💡 Playbook Suggestions:\n`;
      balance.playbookIdentity.suggestions.forEach(suggestion => {
        summary += `  • ${suggestion}\n`;
      });
    }
  }

  return summary;
}

/**
 * Creates a simple text-based yardage distribution chart
 */
export function createSimpleChart(table: MatchupTable): string {
  const outcomes = Object.entries(table.entries).map(([sum, outcome]) => ({
    sum: parseInt(sum),
    yards: outcome.yards
  }));

  const analysis = analyzeDistribution(table, { binSize: 10, showAsciiHistogram: true });

  return analysis.visualization.asciiHistogram + analysis.visualization.summary;
}

/**
 * Validates that a table meets basic distribution requirements
 */
export function validateDistributionRequirements(table: MatchupTable): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const outcomes = Object.entries(table.entries);

  // Check turnover band requirement (GDD requirement)
  const turnoverBandSums = ['3', '4', '5'];
  const hasTurnoverBand = turnoverBandSums.every(sum => sum in table.entries);

  if (!hasTurnoverBand) {
    issues.push('Missing turnover band entries (sums 3-5) - GDD requirement');
  }

  // Check for reasonable yardage distribution
  const yards = outcomes.map(([, outcome]) => outcome.yards);
  const avgYards = yards.reduce((sum, y) => sum + y, 0) / yards.length;

  if (avgYards < 0 || avgYards > 50) {
    issues.push(`Average yards (${avgYards.toFixed(1)}) seems unreasonable`);
  }

  // Check for extreme outliers
  const maxYards = Math.max(...yards);
  const minYards = Math.min(...yards);

  if (maxYards > 100) {
    issues.push(`Maximum yards (${maxYards}) exceeds reasonable range`);
  }

  if (minYards < 0) {
    issues.push(`Negative yards (${minYards}) not allowed`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
