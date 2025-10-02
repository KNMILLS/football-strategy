/**
 * SimulationRunner.ts - Automated playtesting across all dice tables
 *
 * Coordinates the analysis of all dice table combinations with progress tracking,
 * performance monitoring, and batch processing capabilities.
 */

import { createLCG, type RNG } from '../RNG';
import { StatisticalAnalyzer, type TableAnalysis } from './StatisticalAnalyzer';
import { GuardrailChecker, type ComplianceResult } from './GuardrailChecker';
import { PERFORMANCE_REQUIREMENTS } from './Guardrails';

export interface SimulationConfig {
  sampleSize: number;
  seed: number;
  maxConcurrency: number;
  enableProgressTracking: boolean;
  timeoutMs: number;
}

export interface TableInfo {
  id: string;
  playbook: string;
  offenseCard: string;
  defenseCard: string;
  filePath: string;
}

export interface SimulationProgress {
  total: number;
  completed: number;
  current?: string;
  estimatedTimeRemaining?: number;
  errors: string[];
}

export interface SimulationResult {
  analyses: TableAnalysis[];
  compliance: ComplianceResult[];
  errors: string[];
  duration: number;
  config: SimulationConfig;
  summary: {
    compliant: number;
    warning: number;
    violation: number;
    critical: number;
    totalScore: number;
  };
}

export class SimulationRunner {
  private analyzer: StatisticalAnalyzer;
  private checker: GuardrailChecker;
  private config: SimulationConfig;
  private progressCallback?: (progress: SimulationProgress) => void;

  constructor(config: SimulationConfig) {
    this.config = config;
    const rng = createLCG(config.seed);
    this.analyzer = new StatisticalAnalyzer(rng);
    this.checker = new GuardrailChecker();
  }

  /**
   * Runs complete balance analysis on all provided tables
   */
  async runAnalysis(tables: TableInfo[]): Promise<SimulationResult> {
    const startTime = performance.now();
    const errors: string[] = [];

    console.log(`Starting balance analysis for ${tables.length} tables with sample size ${this.config.sampleSize}`);

    // Initialize progress tracking
    const progress: SimulationProgress = {
      total: tables.length,
      completed: 0,
      errors: []
    };

    if (this.config.enableProgressTracking && this.progressCallback) {
      this.progressCallback(progress);
    }

    // Process tables in batches for performance
    const analyses: TableAnalysis[] = [];
    const batchSize = Math.min(this.config.maxConcurrency, tables.length);

    for (let i = 0; i < tables.length; i += batchSize) {
      const batch = tables.slice(i, i + batchSize);
      const batchAnalyses = await this.processBatch(batch, progress, errors);

      analyses.push(...batchAnalyses);

      // Update progress
      progress.completed = Math.min(i + batchSize, tables.length);
      if (progress.completed < tables.length) {
        const elapsed = performance.now() - startTime;
        const rate = progress.completed / elapsed;
        progress.estimatedTimeRemaining = (tables.length - progress.completed) / rate;

        if (this.config.enableProgressTracking && this.progressCallback) {
          this.progressCallback(progress);
        }
      }

      // Check for timeout
      if (performance.now() - startTime > this.config.timeoutMs) {
        errors.push(`Analysis timeout after ${this.config.timeoutMs}ms`);
        break;
      }
    }

    // Run compliance checking
    const compliance = await this.checker.checkBatchCompliance(analyses);

    const duration = performance.now() - startTime;

    // Generate summary
    const summary = this.generateSummary(compliance);

    const result: SimulationResult = {
      analyses,
      compliance,
      errors,
      duration,
      config: this.config,
      summary
    };

    console.log(`Balance analysis complete: ${summary.compliant} compliant, ${summary.violation} violations, ${summary.critical} critical issues`);

    return result;
  }

  /**
   * Processes a batch of tables concurrently
   */
  private async processBatch(
    batch: TableInfo[],
    progress: SimulationProgress,
    errors: string[]
  ): Promise<TableAnalysis[]> {
    const promises = batch.map(async (table) => {
      try {
        progress.current = table.id;
        if (this.config.enableProgressTracking && this.progressCallback) {
          this.progressCallback(progress);
        }

        const analysis = await this.analyzer.analyzeTable(
          table.id,
          table.offenseCard,
          table.defenseCard,
          table.playbook,
          this.config.sampleSize
        );

        return analysis;
      } catch (error) {
        const errorMsg = `Failed to analyze ${table.id}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        progress.errors.push(errorMsg);

        // Return a minimal analysis for error cases
        return {
          tableId: table.id,
          playbook: table.playbook,
          offenseCard: table.offenseCard,
          defenseCard: table.defenseCard,
          sampleSize: 0,
          avgYards: 0,
          yardsStdDev: 0,
          turnoverRate: 0,
          explosiveRate: 0,
          sackRate: 0,
          penaltyRate: 0,
          clockDistribution: { 10: 0, 20: 0, 30: 0 },
          clustering: { explosiveThresholds: [], clusterStrength: 0 },
          redZoneEfficiency: 0,
          analysisTime: 0,
          memoryUsage: 0
        };
      }
    });

    const results = await Promise.all(promises);

    return results.filter(analysis => analysis.sampleSize > 0);
  }

  /**
   * Discovers all available tables from the data directory structure
   */
  static async discoverTables(): Promise<TableInfo[]> {
    const tables: TableInfo[] = [];

    // This would typically scan the data/tables_v1 directory
    // For now, return a representative sample
    const playbookDirs = [
      { name: 'air-raid', files: ['AIR_RAID_FOUR_VERTS_vs_COVER_4.json', 'AIR_RAID_MILLS_vs_MAN_PRESS.json', 'AIR_RAID_PA_DEEP_SHOT_vs_ZONE_BLITZ.json'] },
      { name: 'smashmouth', files: ['SMASHMOUTH_COUNTER_TREY_vs_MAN_FREE.json', 'SMASHMOUTH_PA_DEEP_POST_vs_ZONE_BLITZ.json', 'SMASHMOUTH_POWER_O_vs_COVER_2.json'] },
      { name: 'spread', files: ['SPREAD_FOUR_VERTS_vs_MAN_FREE.json', 'SPREAD_MESH_vs_COVER_3.json', 'SPREAD_ZONE_READ_vs_ZONE_BLITZ.json'] },
      { name: 'west-coast', files: ['WEST_COAST_CURL_vs_MAN_PRESS.json', 'WEST_COAST_SLANT_vs_COVER_2.json', 'WEST_COAST_STICK_vs_ZONE_BLITZ.json'] },
      { name: 'wide-zone', files: ['WIDE_ZONE_BOOT_FLOOD_vs_ZONE_BLITZ.json', 'WIDE_ZONE_INSIDE_ZONE_vs_COVER_3.json', 'WIDE_ZONE_OUTSIDE_ZONE_vs_MAN_PRESS.json'] }
    ];

    playbookDirs.forEach(({ name: playbook, files }) => {
      files.forEach(file => {
        // Parse offense and defense cards from filename
        const parts = file.replace('.json', '').split('_vs_');
        if (parts.length === 2) {
          const offenseCard = parts[0]!.replace(/_/g, ' ');
          const defenseCard = parts[1]!.replace(/_/g, ' ');

          tables.push({
            id: `${playbook}/${file}`,
            playbook,
            offenseCard,
            defenseCard,
            filePath: `data/tables_v1/${playbook}/${file}`
          });
        }
      });
    });

    return tables;
  }

  /**
   * Creates a default configuration for balance analysis
   */
  static createDefaultConfig(): SimulationConfig {
    return {
      sampleSize: 10000, // Large enough for statistical significance
      seed: 12345, // Deterministic for reproducible results
      maxConcurrency: 4, // Reasonable concurrency for most systems
      enableProgressTracking: true,
      timeoutMs: PERFORMANCE_REQUIREMENTS.maxAnalysisTime
    };
  }

  /**
   * Sets progress callback for real-time updates
   */
  setProgressCallback(callback: (progress: SimulationProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Generates summary statistics from compliance results
   */
  private generateSummary(compliance: ComplianceResult[]) {
    const summary = {
      compliant: compliance.filter(c => c.overall === 'compliant').length,
      warning: compliance.filter(c => c.overall === 'warning').length,
      violation: compliance.filter(c => c.overall === 'violation').length,
      critical: compliance.filter(c => c.overall === 'critical').length,
      totalScore: compliance.reduce((sum, c) => sum + c.score, 0) / compliance.length
    };

    return summary;
  }

  /**
   * Validates configuration parameters
   */
  static validateConfig(config: SimulationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.sampleSize < 100) {
      errors.push('Sample size must be at least 100 for meaningful analysis');
    }

    if (config.sampleSize > 100000) {
      errors.push('Sample size over 100,000 may cause performance issues');
    }

    if (config.maxConcurrency < 1) {
      errors.push('Concurrency must be at least 1');
    }

    if (config.maxConcurrency > 16) {
      errors.push('Concurrency over 16 may cause system instability');
    }

    if (config.timeoutMs < 5000) {
      errors.push('Timeout must be at least 5 seconds');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
