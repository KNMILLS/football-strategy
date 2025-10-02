/**
 * GuardrailChecker.test.ts - Tests for GDD compliance validation
 */

import { describe, it, expect } from 'vitest';
import { GuardrailChecker } from '../../../src/sim/balance/GuardrailChecker';
import type { TableAnalysis } from '../../../src/sim/balance/StatisticalAnalyzer';

describe('GuardrailChecker', () => {
  let checker: GuardrailChecker;

  beforeEach(() => {
    checker = new GuardrailChecker();
  });

  describe('Compliance Checking', () => {
    it('should identify compliant tables correctly', () => {
      const compliantAnalysis: TableAnalysis = {
        tableId: 'test/compliant',
        playbook: 'West Coast',
        offenseCard: 'Curl',
        defenseCard: 'Cover 2',
        sampleSize: 10000,
        avgYards: 7.2,
        yardsStdDev: 8.5,
        turnoverRate: 15,
        explosiveRate: 20,
        sackRate: 6,
        penaltyRate: 12,
        clockDistribution: { 10: 30, 20: 35, 30: 35 },
        clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.7 },
        redZoneEfficiency: 75,
        analysisTime: 100,
        memoryUsage: 1000
      };

      const result = checker.checkCompliance(compliantAnalysis);

      expect(result.overall).toBe('compliant');
      expect(result.score).toBeGreaterThan(90);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect critical violations', () => {
      const criticalAnalysis: TableAnalysis = {
        tableId: 'test/critical',
        playbook: 'Air Raid',
        offenseCard: 'Four Verts',
        defenseCard: 'Cover 4',
        sampleSize: 10000,
        avgYards: 5.0, // Too low for Air Raid
        yardsStdDev: 15.0,
        turnoverRate: 35, // Too high
        explosiveRate: 5,  // Too low for Air Raid
        sackRate: 15,     // Too high
        penaltyRate: 25,  // Too high
        clockDistribution: { 10: 60, 20: 30, 30: 10 }, // Unbalanced
        clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.2 },
        redZoneEfficiency: 45, // Too low
        analysisTime: 100,
        memoryUsage: 1000
      };

      const result = checker.checkCompliance(criticalAnalysis);

      expect(result.overall).toBe('critical');
      expect(result.violations.length).toBeGreaterThan(3);
      expect(result.violations.some(v => v.severity === 'critical')).toBe(true);
    });

    it('should handle playbook-specific violations', () => {
      const smashmouthAnalysis: TableAnalysis = {
        tableId: 'test/smashmouth-pass-heavy',
        playbook: 'Smashmouth',
        offenseCard: 'Power O',
        defenseCard: 'Cover 2',
        sampleSize: 10000,
        avgYards: 4.5,
        yardsStdDev: 3.2,
        turnoverRate: 12,
        explosiveRate: 8,
        sackRate: 5,
        penaltyRate: 10,
        clockDistribution: { 10: 20, 20: 30, 30: 50 },
        clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.6 },
        redZoneEfficiency: 75,
        analysisTime: 100,
        memoryUsage: 1000
      };

      const result = checker.checkCompliance(smashmouthAnalysis);

      // Should detect that pass rate is too low for Smashmouth identity
      expect(result.overall).toBe('warning');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should detect clock runoff imbalances', () => {
      const unbalancedClock: TableAnalysis = {
        tableId: 'test/unbalanced-clock',
        playbook: 'West Coast',
        offenseCard: 'Slant',
        defenseCard: 'Man Press',
        sampleSize: 10000,
        avgYards: 6.8,
        yardsStdDev: 7.2,
        turnoverRate: 14,
        explosiveRate: 18,
        sackRate: 6,
        penaltyRate: 11,
        clockDistribution: { 10: 70, 20: 20, 30: 10 }, // Very unbalanced
        clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.6 },
        redZoneEfficiency: 76,
        analysisTime: 100,
        memoryUsage: 1000
      };

      const result = checker.checkCompliance(unbalancedClock);

      expect(result.overall).toBe('violation');
      expect(result.violations.some(v => v.guardrail.includes('clockBalance'))).toBe(true);
    });
  });

  describe('Batch Compliance Checking', () => {
    it('should process multiple tables efficiently', async () => {
      const analyses: TableAnalysis[] = [
        {
          tableId: 'test/table1',
          playbook: 'West Coast',
          offenseCard: 'Curl',
          defenseCard: 'Cover 2',
          sampleSize: 1000,
          avgYards: 7.0,
          yardsStdDev: 8.0,
          turnoverRate: 15,
          explosiveRate: 20,
          sackRate: 6,
          penaltyRate: 12,
          clockDistribution: { 10: 30, 20: 35, 30: 35 },
          clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.7 },
          redZoneEfficiency: 75,
          analysisTime: 100,
          memoryUsage: 1000
        },
        {
          tableId: 'test/table2',
          playbook: 'Air Raid',
          offenseCard: 'Four Verts',
          defenseCard: 'Cover 4',
          sampleSize: 1000,
          avgYards: 10.0,
          yardsStdDev: 12.0,
          turnoverRate: 18,
          explosiveRate: 28,
          sackRate: 7,
          penaltyRate: 13,
          clockDistribution: { 10: 40, 20: 35, 30: 25 },
          clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.8 },
          redZoneEfficiency: 78,
          analysisTime: 100,
          memoryUsage: 1000
        }
      ];

      const results = await checker.checkBatchCompliance(analyses);

      expect(results).toHaveLength(2);
      expect(results[0].tableId).toBe('test/table1');
      expect(results[1].tableId).toBe('test/table2');

      // Both should be compliant or have minor warnings
      expect(['compliant', 'warning']).toContain(results[0].overall);
      expect(['compliant', 'warning']).toContain(results[1].overall);
    });
  });

  describe('Guardrail Application', () => {
    it('should return applicable guardrails for each playbook', () => {
      const westCoastGuardrails = checker.getApplicableGuardrails('West Coast');
      expect(westCoastGuardrails).toContain('explosivePassRate');
      expect(westCoastGuardrails).toContain('playbookPassRate_West Coast');

      const airRaidGuardrails = checker.getApplicableGuardrails('Air Raid');
      expect(airRaidGuardrails).toContain('airRaidPassRate');
      expect(airRaidGuardrails).toContain('playbookPassRate_Air Raid');
    });

    it('should handle unknown playbooks gracefully', () => {
      const guardrails = checker.getApplicableGuardrails('Unknown Playbook');
      expect(guardrails.length).toBeGreaterThan(0); // Should still have base guardrails
      expect(guardrails).toContain('explosivePassRate');
    });
  });

  describe('Violation Details', () => {
    it('should provide detailed violation information', () => {
      const analysis: TableAnalysis = {
        tableId: 'test/violations',
        playbook: 'Air Raid',
        offenseCard: 'Deep Shot',
        defenseCard: 'Zone Blitz',
        sampleSize: 10000,
        avgYards: 3.0, // Too low for Air Raid
        yardsStdDev: 5.0,
        turnoverRate: 8, // Too low
        explosiveRate: 5, // Too low for Air Raid
        sackRate: 2,     // Too low
        penaltyRate: 5,  // Too low
        clockDistribution: { 10: 25, 20: 25, 30: 50 },
        clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.4 },
        redZoneEfficiency: 60, // Too low
        analysisTime: 100,
        memoryUsage: 1000
      };

      const result = checker.checkCompliance(analysis);

      expect(result.violations.length).toBeGreaterThan(0);

      const violation = result.violations[0];
      expect(violation.guardrail).toBeDefined();
      expect(violation.severity).toMatch(/^(low|medium|high|critical)$/);
      expect(violation.actual).toBeDefined();
      expect(violation.expected).toBeDefined();
      expect(violation.description).toBeDefined();
      expect(violation.recommendation).toBeDefined();
    });

    it('should calculate deviation correctly', () => {
      const analysis: TableAnalysis = {
        tableId: 'test/deviation',
        playbook: 'West Coast',
        offenseCard: 'Stick',
        defenseCard: 'Cover 3',
        sampleSize: 10000,
        avgYards: 12.0, // Above expected range for West Coast
        yardsStdDev: 9.0,
        turnoverRate: 15,
        explosiveRate: 35, // Above 25% max
        sackRate: 6,
        penaltyRate: 12,
        clockDistribution: { 10: 30, 20: 35, 30: 35 },
        clustering: { explosiveThresholds: [20, 25, 30], clusterStrength: 0.7 },
        redZoneEfficiency: 75,
        analysisTime: 100,
        memoryUsage: 1000
      };

      const result = checker.checkCompliance(analysis);

      const explosiveViolation = result.violations.find(v => v.guardrail === 'explosivePassRate');
      expect(explosiveViolation).toBeDefined();
      expect(explosiveViolation!.deviation).toBeGreaterThan(0);
      expect(explosiveViolation!.actual).toBe(35);
    });
  });
});
