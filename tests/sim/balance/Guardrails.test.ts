/**
 * Guardrails.test.ts - Tests for balance guardrails and constants
 */

import { describe, it, expect } from 'vitest';
import { BALANCE_GUARDRAILS, PLAYBOOK_IDENTITY_GUARDRAILS, STATISTICAL_THRESHOLDS } from '../../../src/sim/balance/Guardrails';

describe('Balance Guardrails', () => {
  describe('BALANCE_GUARDRAILS', () => {
    it('should define all required NFL analytics guardrails', () => {
      const expectedGuardrails = [
        'explosivePassRate',
        'sackRate',
        'deepAttemptRate',
        'turnoverRate',
        'smashmouthRunRate',
        'airRaidPassRate',
        'clockRunoffBalance',
        'redZoneEfficiency',
        'penaltyRate'
      ];

      expectedGuardrails.forEach(guardrail => {
        expect(BALANCE_GUARDRAILS[guardrail]).toBeDefined();
        expect(BALANCE_GUARDRAILS[guardrail].min).toBeLessThanOrEqual(BALANCE_GUARDRAILS[guardrail].max);
      });
    });

    it('should have realistic NFL-based ranges for explosive pass rate', () => {
      const guardrail = BALANCE_GUARDRAILS.explosivePassRate;
      expect(guardrail.min).toBe(15);
      expect(guardrail.max).toBe(25);
      expect(guardrail.unit).toBe('percentage');
    });

    it('should have realistic NFL-based ranges for sack rate', () => {
      const guardrail = BALANCE_GUARDRAILS.sackRate;
      expect(guardrail.min).toBe(4);
      expect(guardrail.max).toBe(8);
      expect(guardrail.unit).toBe('percentage');
    });

    it('should define playbook-specific run/pass mixes', () => {
      expect(BALANCE_GUARDRAILS.smashmouthRunRate.min).toBe(40);
      expect(BALANCE_GUARDRAILS.smashmouthRunRate.max).toBe(60);
      expect(BALANCE_GUARDRAILS.airRaidPassRate.min).toBe(60);
      expect(BALANCE_GUARDRAILS.airRaidPassRate.max).toBe(80);
    });
  });

  describe('PLAYBOOK_IDENTITY_GUARDRAILS', () => {
    it('should define identity requirements for all five playbooks', () => {
      const expectedPlaybooks = ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'];

      expectedPlaybooks.forEach(playbook => {
        expect(PLAYBOOK_IDENTITY_GUARDRAILS[playbook]).toBeDefined();
        expect(PLAYBOOK_IDENTITY_GUARDRAILS[playbook].passRate).toBeDefined();
        expect(PLAYBOOK_IDENTITY_GUARDRAILS[playbook].avgGain).toBeDefined();
        expect(PLAYBOOK_IDENTITY_GUARDRAILS[playbook].explosiveRate).toBeDefined();
      });
    });

    it('should reflect Air Raid aggressive passing identity', () => {
      const airRaid = PLAYBOOK_IDENTITY_GUARDRAILS['Air Raid'];
      expect(airRaid.passRate.min).toBe(70);
      expect(airRaid.passRate.max).toBe(85);
      expect(airRaid.explosiveRate.min).toBe(20);
      expect(airRaid.explosiveRate.max).toBe(30);
    });

    it('should reflect Smashmouth ground game identity', () => {
      const smashmouth = PLAYBOOK_IDENTITY_GUARDRAILS['Smashmouth'];
      expect(smashmouth.passRate.min).toBe(25);
      expect(smashmouth.passRate.max).toBe(45);
      expect(smashmouth.explosiveRate.min).toBe(8);
      expect(smashmouth.explosiveRate.max).toBe(15);
    });
  });

  describe('STATISTICAL_THRESHOLDS', () => {
    it('should define appropriate minimum sample size', () => {
      expect(STATISTICAL_THRESHOLDS.minSampleSize).toBe(1000);
    });

    it('should define reasonable confidence level', () => {
      expect(STATISTICAL_THRESHOLDS.confidenceLevel).toBe(0.95);
    });

    it('should define maximum standard error threshold', () => {
      expect(STATISTICAL_THRESHOLDS.maxStandardError).toBe(0.02);
    });

    it('should define minimum effect size for significance', () => {
      expect(STATISTICAL_THRESHOLDS.minEffectSize).toBe(0.05);
    });
  });

  describe('Guardrail validation', () => {
    it('should have non-overlapping ranges where appropriate', () => {
      // Test that guardrails don't have impossible overlaps
      Object.values(BALANCE_GUARDRAILS).forEach(guardrail => {
        expect(guardrail.min).toBeLessThanOrEqual(guardrail.max);
        expect(guardrail.min).toBeGreaterThanOrEqual(0);
        expect(guardrail.max).toBeLessThanOrEqual(100); // Percentages shouldn't exceed 100
      });
    });

    it('should have reasonable ranges for statistical validity', () => {
      // Test that ranges are wide enough for statistical significance
      Object.values(BALANCE_GUARDRAILS).forEach(guardrail => {
        const range = guardrail.max - guardrail.min;
        expect(range).toBeGreaterThanOrEqual(4); // At least 4% range for meaningful analysis
      });
    });
  });
});
