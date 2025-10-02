import { describe, it, expect } from 'vitest';
import { scaffoldMatchupTable, suggestTableName, validateTableName } from '../../../src/tools/table-authoring/TableScaffolder.js';

describe('TableScaffolder', () => {
  describe('scaffoldMatchupTable', () => {
    it('should create a valid table with balanced template', () => {
      const result = scaffoldMatchupTable({
        offCard: 'West Coast',
        defCard: 'Blitz',
        template: 'balanced'
      });

      expect(result.table).toBeDefined();
      expect(result.table.off_card).toBe('West Coast');
      expect(result.table.def_card).toBe('Blitz');
      expect(result.table.dice).toBe('2d20');
      expect(result.table.version).toBe('1.0.0');

      // Should have entries for sums 3-39
      expect(Object.keys(result.table.entries)).toHaveLength(37);
      expect(result.table.entries['3']).toBeDefined();
      expect(result.table.entries['39']).toBeDefined();

      // Should have doubles entries
      expect(result.table.doubles['1']).toBeDefined();
      expect(result.table.doubles['20']).toBeDefined();
      expect(result.table.doubles['2-19']).toBeDefined();

      // Should have meta section
      expect(result.table.meta).toBeDefined();
      expect(result.table.meta.risk_profile).toBe('medium');

      // Should not have critical errors
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should create table with conservative template', () => {
      const result = scaffoldMatchupTable({
        offCard: 'Smashmouth',
        defCard: 'Rush',
        template: 'conservative'
      });

      expect(result.table.meta.risk_profile).toBe('low');
      expect(result.table.meta.field_pos_clamp).toBe(true);
      expect(result.table.meta.oob_bias).toBe(false);
    });

    it('should create table with aggressive template', () => {
      const result = scaffoldMatchupTable({
        offCard: 'Air Raid',
        defCard: 'Coverage',
        template: 'aggressive'
      });

      expect(result.table.meta.risk_profile).toBe('high');
      expect(result.table.meta.oob_bias).toBe(true);
      expect(result.table.meta.field_pos_clamp).toBe(false);
    });

    it('should include turnover entries in turnover band for appropriate templates', () => {
      const conservativeResult = scaffoldMatchupTable({
        offCard: 'Smashmouth',
        defCard: 'Rush',
        template: 'conservative'
      });

      const aggressiveResult = scaffoldMatchupTable({
        offCard: 'Air Raid',
        defCard: 'Coverage',
        template: 'aggressive'
      });

      const balancedResult = scaffoldMatchupTable({
        offCard: 'West Coast',
        defCard: 'Blitz',
        template: 'balanced'
      });

      // Conservative and aggressive should have turnovers in 3-5 range
      expect(conservativeResult.table.entries['3'].turnover).toBeDefined();
      expect(conservativeResult.table.entries['4'].turnover).toBeDefined();
      expect(conservativeResult.table.entries['5'].turnover).toBeDefined();

      expect(aggressiveResult.table.entries['3'].turnover).toBeDefined();
      expect(aggressiveResult.table.entries['4'].turnover).toBeDefined();
      expect(aggressiveResult.table.entries['5'].turnover).toBeDefined();

      // Balanced should not have turnovers by default
      expect(balancedResult.table.entries['3'].turnover).toBeUndefined();
      expect(balancedResult.table.entries['4'].turnover).toBeUndefined();
      expect(balancedResult.table.entries['5'].turnover).toBeUndefined();
    });

    it('should respect custom options', () => {
      const result = scaffoldMatchupTable({
        offCard: 'Test Offense',
        defCard: 'Test Defense',
        riskProfile: 'high',
        explosiveStartSum: 25,
        oobBias: true,
        fieldPosClamp: false
      });

      expect(result.table.meta.risk_profile).toBe('high');
      expect(result.table.meta.explosive_start_sum).toBe(25);
      expect(result.table.meta.oob_bias).toBe(true);
      expect(result.table.meta.field_pos_clamp).toBe(false);
    });

    it('should validate required parameters', () => {
      expect(() => {
        scaffoldMatchupTable({
          offCard: '',
          defCard: 'Test Defense'
        });
      }).toThrow('offCard and defCard are required');
    });

    it('should warn about invalid explosive start sum', () => {
      const result = scaffoldMatchupTable({
        offCard: 'Test Offense',
        defCard: 'Test Defense',
        explosiveStartSum: 50 // Outside 20-39 range
      });

      expect(result.warnings.some(w => w.includes('explosiveStartSum'))).toBe(true);
    });
  });

  describe('suggestTableName', () => {
    it('should generate reasonable table names', () => {
      expect(suggestTableName('West Coast', 'Blitz')).toBe('west_blitz');
      expect(suggestTableName('Air Raid', 'Coverage')).toBe('air_coverage');
      expect(suggestTableName('Smashmouth', 'Rush')).toBe('smashmouth_rush');
    });

  it('should handle complex card names', () => {
    expect(suggestTableName('West Coast Offense', 'Blitz Defense')).toBe('west_blitz');
    expect(suggestTableName('Air Raid Attack', 'Coverage Scheme')).toBe('air_coverage');
  });
  });

  describe('validateTableName', () => {
    it('should validate correct table names', () => {
      expect(validateTableName('west_coast_blitz').valid).toBe(true);
      expect(validateTableName('air_raid_123').valid).toBe(true);
      expect(validateTableName('test-table_name').valid).toBe(true);
    });

    it('should reject invalid table names', () => {
      expect(validateTableName('').valid).toBe(false);
      expect(validateTableName('a'.repeat(51)).valid).toBe(false);
      expect(validateTableName('invalid name').valid).toBe(false);
      expect(validateTableName('invalid@name').valid).toBe(false);
    });

    it('should provide helpful error messages', () => {
      const result = validateTableName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');

      const longResult = validateTableName('a'.repeat(51));
      expect(longResult.valid).toBe(false);
      expect(longResult.error).toContain('too long');
    });
  });
});
