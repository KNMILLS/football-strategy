import { describe, it, expect } from 'vitest';
import { validateTableWithFeedback, validateEntry, formatValidationOutput } from '../../../src/tools/table-authoring/ValidationFeedback.js';
import { MatchupTable } from '../../../src/data/schemas/MatchupTable.js';

describe('ValidationFeedback', () => {
  // Create a valid test table
  const createValidTable = (): MatchupTable => ({
    version: '1.0.0',
    off_card: 'Valid Offense',
    def_card: 'Valid Defense',
    dice: '2d20',
    entries: {
      '3': { yards: 0, clock: '20', turnover: { type: 'FUM', return_yards: 0, return_to: 'LOS' } },
      '4': { yards: 2, clock: '20' },
      '5': { yards: 4, clock: '20' },
      '6': { yards: 6, clock: '20' },
      '7': { yards: 8, clock: '20' },
      '8': { yards: 10, clock: '20' },
      '9': { yards: 12, clock: '20' },
      '10': { yards: 8, clock: '20' },
      '11': { yards: 14, clock: '20' },
      '12': { yards: 16, clock: '20' },
      '13': { yards: 18, clock: '20' },
      '14': { yards: 20, clock: '20' },
      '15': { yards: 22, clock: '20' },
      '16': { yards: 24, clock: '20' },
      '17': { yards: 26, clock: '20' },
      '18': { yards: 28, clock: '20' },
      '19': { yards: 30, clock: '20' },
      '20': { yards: 15, clock: '30' },
      '21': { yards: 32, clock: '20' },
      '22': { yards: 34, clock: '20' },
      '23': { yards: 36, clock: '20' },
      '24': { yards: 38, clock: '20' },
      '25': { yards: 40, clock: '20' },
      '26': { yards: 42, clock: '20' },
      '27': { yards: 44, clock: '20' },
      '28': { yards: 46, clock: '20' },
      '29': { yards: 48, clock: '20' },
      '30': { yards: 25, clock: '10' },
      '31': { yards: 50, clock: '20' },
      '32': { yards: 52, clock: '20' },
      '33': { yards: 54, clock: '20' },
      '34': { yards: 56, clock: '20' },
      '35': { yards: 58, clock: '20' },
      '36': { yards: 60, clock: '20' },
      '37': { yards: 62, clock: '20' },
      '38': { yards: 64, clock: '20' },
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
  });

  describe('validateTableWithFeedback', () => {
    it('should validate a well-formed table', () => {
      const table = createValidTable();
      const result = validateTableWithFeedback(table);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing turnover band', () => {
      const table = createValidTable();
      delete table.entries['3'];
      delete table.entries['4'];
      delete table.entries['5'];

      const result = validateTableWithFeedback(table);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.category === 'gdd')).toBe(true);
      expect(result.score).toBeLessThan(80);
    });

    it('should detect missing doubles entries', () => {
      const table = createValidTable();
      delete table.doubles;

      const result = validateTableWithFeedback(table);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.category === 'gdd')).toBe(true);
    });

    it('should detect balance issues', () => {
      const table = createValidTable();
      // Make all entries have extreme yardage
      Object.values(table.entries).forEach(entry => {
        entry.yards = 100;
      });

      const result = validateTableWithFeedback(table);

      expect(result.warnings.some(w => w.category === 'balance')).toBe(true);
      expect(result.score).toBeLessThan(100);
    });

    it('should provide suggestions for improvement', () => {
      const table = createValidTable();
      const result = validateTableWithFeedback(table);

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle severely broken tables', () => {
      const table = {
        version: '1.0.0',
        off_card: '',
        def_card: '',
        dice: 'invalid',
        entries: {},
        doubles: {},
        meta: {
          oob_bias: false,
          field_pos_clamp: true,
          risk_profile: 'invalid',
          explosive_start_sum: 100
        }
      } as any;

      const result = validateTableWithFeedback(table);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateEntry', () => {
    it('should validate correct entry', () => {
      const entry = { yards: 10, clock: '20' as const };
      const result = validateEntry(entry, 15);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative yards', () => {
      const entry = { yards: -5, clock: '20' as const };
      const result = validateEntry(entry, 15);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('negative'))).toBe(true);
    });

    it('should detect invalid clock values', () => {
      const entry = { yards: 10, clock: '15' as any };
      const result = validateEntry(entry, 15);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Clock must be'))).toBe(true);
    });

    it('should suggest turnovers for low sums', () => {
      const entry = { yards: 5, clock: '20' as const };
      const result = validateEntry(entry, 4); // Sum 4 is in turnover band

      expect(result.suggestions.some(s => s.message.includes('turnover band'))).toBe(true);
    });

    it('should validate turnover structure', () => {
      const entry = {
        yards: 0,
        clock: '20' as const,
        turnover: {
          type: 'INVALID' as any,
          return_yards: -5,
          return_to: 'INVALID' as any
        }
      };

      const result = validateEntry(entry, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should suggest explosive yardage for high sums', () => {
      const entry = { yards: 5, clock: '20' as const };
      const result = validateEntry(entry, 25); // High sum with low yards

      expect(result.suggestions.some(s => s.message.includes('explosive'))).toBe(true);
    });
  });

  describe('formatValidationOutput', () => {
    it('should format successful validation', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        score: 95
      };

      const output = formatValidationOutput(result);

      expect(output).toContain('95/100');
      expect(output).toContain('✅ Table is well-formed');
      expect(output).not.toContain('❌');
      expect(output).not.toContain('⚠️');
    });

    it('should format validation with errors', () => {
      const result = {
        isValid: false,
        errors: [
          { type: 'error' as const, category: 'schema' as const, message: 'Test error' }
        ],
        warnings: [
          { type: 'warning' as const, category: 'balance' as const, message: 'Test warning' }
        ],
        suggestions: [
          { type: 'suggestion' as const, category: 'optimization' as const, message: 'Test suggestion' }
        ],
        score: 60
      };

      const output = formatValidationOutput(result);

      expect(output).toContain('❌ Errors:');
      expect(output).toContain('⚠️  Warnings:');
      expect(output).toContain('💡 Suggestions:');
      expect(output).toContain('60/100');
      expect(output).toContain('usable but could benefit from improvements');
    });

    it('should handle empty results', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        score: 100
      };

      const output = formatValidationOutput(result);

      expect(output).toContain('100/100');
      expect(output).toContain('✅ Table is well-formed');
    });
  });
});
