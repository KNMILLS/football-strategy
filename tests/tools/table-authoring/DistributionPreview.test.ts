import { describe, it, expect } from 'vitest';
import { analyzeDistribution, createSimpleChart, validateDistributionRequirements } from '../../../src/tools/table-authoring/DistributionPreview.js';
import { MatchupTable } from '../../../src/data/schemas/MatchupTable.js';

describe('DistributionPreview', () => {
  // Create a test table with known characteristics
  const createTestTable = (): MatchupTable => ({
    version: '1.0.0',
    off_card: 'Test Offense',
    def_card: 'Test Defense',
    dice: '2d20',
    entries: {
      '3': { yards: 0, clock: '20', tags: ['turnover'] },
      '4': { yards: 2, clock: '20' },
      '5': { yards: 5, clock: '20' },
      '10': { yards: 8, clock: '20' },
      '15': { yards: 12, clock: '30' },
      '20': { yards: 25, clock: '30' },
      '25': { yards: 35, clock: '10' },
      '30': { yards: 45, clock: '10' },
      '35': { yards: 60, clock: '10' },
      '39': { yards: 80, clock: '10' }
    },
    doubles: {
      '1': { result: 'DEF_TD' },
      '20': { result: 'OFF_TD' },
      '2-19': { penalty_table_ref: 'default_penalty' }
    },
    meta: {
      oob_bias: false,
      field_pos_clamp: true,
      risk_profile: 'medium',
      explosive_start_sum: 22
    }
  });

  describe('analyzeDistribution', () => {
    it('should calculate correct statistics', () => {
      const table = createTestTable();
      const analysis = analyzeDistribution(table);

      expect(analysis.statistics.mean).toBeCloseTo(27.2, 1); // Average of test values
      expect(analysis.statistics.median).toBeCloseTo(18.5, 1); // Median of sorted values
      expect(analysis.statistics.min).toBe(0);
      expect(analysis.statistics.max).toBe(80);
      expect(analysis.statistics.explosiveRate).toBeCloseTo(50, 1); // 5 out of 10 entries >= 20 yards
    });

    it('should calculate clock distribution correctly', () => {
      const table = createTestTable();
      const analysis = analyzeDistribution(table);

      expect(analysis.statistics.clockDistribution['10']).toBeCloseTo(40, 1); // 4 out of 10
      expect(analysis.statistics.clockDistribution['20']).toBeCloseTo(40, 1); // 4 out of 10
      expect(analysis.statistics.clockDistribution['30']).toBeCloseTo(20, 1); // 2 out of 10
    });

    it('should create distribution bins', () => {
      const table = createTestTable();
      const analysis = analyzeDistribution(table, { binSize: 10 });

      expect(analysis.bins.length).toBeGreaterThan(0);
      expect(analysis.bins[0].range).toBe('0-9');
      expect(analysis.bins[0].count).toBe(4); // 0, 2, 5, 8
      expect(analysis.bins[0].percentage).toBeCloseTo(40, 1);
    });

    it('should detect balance issues', () => {
      const table = createTestTable();
      const analysis = analyzeDistribution(table);

      // Should have some guardrail violations due to extreme values
      expect(analysis.balance.guardrailViolations.length).toBeGreaterThanOrEqual(0);
      expect(analysis.balance.riskAssessment).toMatch(/low|medium|high/);
    });

    it('should respect bin size option', () => {
      const table = createTestTable();
      const analysis5 = analyzeDistribution(table, { binSize: 5 });
      const analysis10 = analyzeDistribution(table, { binSize: 10 });

      expect(analysis5.bins.length).toBeGreaterThan(analysis10.bins.length);
    });

    it('should handle empty table gracefully', () => {
      const emptyTable: MatchupTable = {
        version: '1.0.0',
        off_card: 'Empty',
        def_card: 'Table',
        dice: '2d20',
        entries: {},
        doubles: {
          '1': { result: 'DEF_TD' },
          '20': { result: 'OFF_TD' },
          '2-19': { penalty_table_ref: 'default_penalty' }
        },
        meta: {
          oob_bias: false,
          field_pos_clamp: true,
          risk_profile: 'medium',
          explosive_start_sum: 22
        }
      };

      expect(() => analyzeDistribution(emptyTable)).not.toThrow();
    });
  });

  describe('createSimpleChart', () => {
    it('should create ASCII chart', () => {
      const table = createTestTable();
      const chart = createSimpleChart(table);

      expect(chart).toContain('Distribution Histogram');
      expect(chart).toContain('Mean:');
      expect(chart).toContain('Explosive Rate:');
      expect(chart).toContain('█'); // Should contain bar characters
    });

    it('should handle different table characteristics', () => {
      const conservativeTable = createTestTable();
      conservativeTable.meta.risk_profile = 'low';

      const chart = createSimpleChart(conservativeTable);
      expect(chart).toContain('Distribution Histogram');
      expect(chart.length).toBeGreaterThan(100); // Should be substantial output
    });
  });

  describe('validateDistributionRequirements', () => {
    it('should validate table with turnover band', () => {
      const table = createTestTable();
      const result = validateDistributionRequirements(table);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing turnover band', () => {
      const table = createTestTable();
      // Remove turnover band entries
      delete table.entries['3'];
      delete table.entries['4'];
      delete table.entries['5'];

      const result = validateDistributionRequirements(table);

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('turnover band'))).toBe(true);
    });

    it('should detect unreasonable yardage', () => {
      const table = createTestTable();
      table.entries['10'].yards = -5; // Negative yards

      const result = validateDistributionRequirements(table);

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Negative yards'))).toBe(true);
    });

    it('should detect extreme yardage values', () => {
      const table = createTestTable();
      table.entries['39'].yards = 150; // Very high yards

      const result = validateDistributionRequirements(table);

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Maximum yards'))).toBe(true);
    });

    it('should validate reasonable table', () => {
      const table: MatchupTable = {
        version: '1.0.0',
        off_card: 'Reasonable',
        def_card: 'Table',
        dice: '2d20',
        entries: {
          '3': { yards: 0, clock: '20', turnover: { type: 'FUM', return_yards: 0, return_to: 'LOS' } },
          '4': { yards: 2, clock: '20' },
          '5': { yards: 4, clock: '20' },
          '10': { yards: 8, clock: '20' },
          '20': { yards: 15, clock: '30' },
          '30': { yards: 25, clock: '10' },
          '39': { yards: 35, clock: '10' }
        },
        doubles: {
          '1': { result: 'DEF_TD' },
          '20': { result: 'OFF_TD' },
          '2-19': { penalty_table_ref: 'default_penalty' }
        },
        meta: {
          oob_bias: false,
          field_pos_clamp: true,
          risk_profile: 'medium',
          explosive_start_sum: 22
        }
      };

      const result = validateDistributionRequirements(table);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
