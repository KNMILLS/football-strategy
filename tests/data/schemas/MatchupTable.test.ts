import { describe, it, expect } from 'vitest';
import { MatchupTableSchema, PenaltyTableSchema, type MatchupTable, type PenaltyTable } from '../../../src/data/schemas/MatchupTable';

describe('MatchupTable Schema Validation', () => {
  it('should validate a complete matchup table', () => {
    const validTable: MatchupTable = {
      version: 'v1',
      off_card: 'WEST_COAST_QUICK_SLANT',
      def_card: 'DEF_COVER_2',
      dice: '2d20',
      entries: {
        '3': { yards: -5, clock: '30', tags: ['sack'] },
        '4': { yards: -3, clock: '30', tags: ['loss'] },
        '5': { yards: 0, clock: '20', tags: ['incomplete'] },
        '6': { yards: 2, clock: '20', tags: ['short'] },
        '7': { yards: 4, clock: '20', tags: ['short'] },
        '8': { yards: 6, clock: '20', tags: ['checkdown'] },
        '9': { yards: 8, clock: '20', tags: ['checkdown'] },
        '10': { yards: 10, clock: '20', tags: ['first_down'] },
        '11': { yards: 12, clock: '20', tags: ['first_down'] },
        '12': { yards: 14, clock: '20', tags: ['drive'] },
        '13': { yards: 16, clock: '20', tags: ['drive'] },
        '14': { yards: 18, clock: '20', tags: ['drive'] },
        '15': { yards: 20, clock: '10', tags: ['explosive'] },
        '16': { yards: 22, clock: '10', tags: ['explosive'] },
        '17': { yards: 25, clock: '10', tags: ['explosive'] },
        '18': { yards: 28, clock: '10', tags: ['explosive'] },
        '19': { yards: 32, clock: '10', tags: ['explosive'] },
        '20': { yards: 35, clock: '10', tags: ['explosive'] },
        '21': { yards: 38, clock: '10', tags: ['explosive'] },
        '22': { yards: 42, clock: '10', tags: ['explosive'] },
        '23': { yards: 45, clock: '10', tags: ['explosive'] },
        '24': { yards: 48, clock: '10', tags: ['explosive'] },
        '25': { yards: 52, clock: '10', tags: ['explosive'] },
        '26': { yards: 55, clock: '10', tags: ['explosive'] },
        '27': { yards: 58, clock: '10', tags: ['explosive'] },
        '28': { yards: 62, clock: '10', tags: ['explosive'] },
        '29': { yards: 65, clock: '10', tags: ['explosive'] },
        '30': { yards: 68, clock: '10', tags: ['explosive'] },
        '31': { yards: 72, clock: '10', tags: ['explosive'] },
        '32': { yards: 75, clock: '10', tags: ['explosive'] },
        '33': { yards: 78, clock: '10', tags: ['explosive'] },
        '34': { yards: 82, clock: '10', tags: ['explosive'] },
        '35': { yards: 85, clock: '10', tags: ['explosive'] },
        '36': { yards: 88, clock: '10', tags: ['explosive'] },
        '37': { yards: 92, clock: '10', tags: ['explosive'] },
        '38': { yards: 95, clock: '10', tags: ['explosive'] },
        '39': { yards: 99, clock: '10', tags: ['explosive'] },
      },
      doubles: {
        '1': { result: 'DEF_TD' },
        '20': { result: 'OFF_TD' },
        '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
      },
      meta: {
        oob_bias: false,
        field_pos_clamp: true,
        risk_profile: 'medium',
        explosive_start_sum: 25,
      },
    };

    const result = MatchupTableSchema.safeParse(validTable);
    expect(result.success).toBe(true);
  });

  it('should validate penalty table', () => {
    const validPenaltyTable: PenaltyTable = {
      version: 'v1',
      entries: [
        { side: 'offense', yards: -15, loss_of_down: true, description: 'Offensive Holding' },
        { side: 'offense', yards: -15, description: 'Personal Foul' },
        { side: 'offense', yards: -10, description: 'Offensive Holding' },
        { side: 'offense', yards: -5, replay: true, description: 'False Start' },
        { side: 'offense', yards: 0, replay: true, description: 'Offsetting Penalties' },
        { side: 'defense', yards: 5, replay: true, description: 'Encroachment' },
        { side: 'defense', yards: 5, description: 'Offside' },
        { side: 'defense', yards: 10, description: 'Illegal Hands to the Face' },
        { side: 'defense', yards: 10, auto_first: true, description: 'Defensive Holding' },
        { side: 'defense', yards: 15, auto_first: true, description: 'Personal Foul' },
      ],
    };

    const result = PenaltyTableSchema.safeParse(validPenaltyTable);
    expect(result.success).toBe(true);
  });

  it('should reject incomplete matchup table (missing sum)', () => {
    const incompleteTable = {
      version: 'v1',
      off_card: 'WEST_COAST_QUICK_SLANT',
      def_card: 'DEF_COVER_2',
      dice: '2d20',
      entries: {
        '3': { yards: -5, clock: '30' },
        // Missing '4' through '39'
      },
      doubles: {
        '1': { result: 'DEF_TD' },
        '20': { result: 'OFF_TD' },
        '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
      },
      meta: {
        oob_bias: false,
        field_pos_clamp: true,
        risk_profile: 'medium',
        explosive_start_sum: 25,
      },
    };

    const result = MatchupTableSchema.safeParse(incompleteTable);
    expect(result.success).toBe(false);
  });

  it('should reject invalid clock values', () => {
    const invalidTable = {
      version: 'v1',
      off_card: 'WEST_COAST_QUICK_SLANT',
      def_card: 'DEF_COVER_2',
      dice: '2d20',
      entries: {
        '3': { yards: 5, clock: '15' }, // Invalid clock value
      },
      doubles: {
        '1': { result: 'DEF_TD' },
        '20': { result: 'OFF_TD' },
        '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
      },
      meta: {
        oob_bias: false,
        field_pos_clamp: true,
        risk_profile: 'medium',
        explosive_start_sum: 25,
      },
    };

    const result = MatchupTableSchema.safeParse(invalidTable);
    expect(result.success).toBe(false);
  });

  it('should validate turnover outcomes', () => {
    const tableWithTurnover: MatchupTable = {
      version: 'v1',
      off_card: 'AIR_RAID_DEEP_SHOT',
      def_card: 'DEF_COVER_1',
      dice: '2d20',
      entries: {
        '3': {
          yards: 0,
          clock: '20',
          turnover: { type: 'INT', return_yards: 25 }
        },
        '4': { yards: 5, clock: '20' },
        '5': { yards: 10, clock: '20' },
        // ... fill remaining entries
        '6': { yards: 2, clock: '20' },
        '7': { yards: 4, clock: '20' },
        '8': { yards: 6, clock: '20' },
        '9': { yards: 8, clock: '20' },
        '10': { yards: 10, clock: '20' },
        '11': { yards: 12, clock: '20' },
        '12': { yards: 14, clock: '20' },
        '13': { yards: 16, clock: '20' },
        '14': { yards: 18, clock: '20' },
        '15': { yards: 20, clock: '10' },
        '16': { yards: 22, clock: '10' },
        '17': { yards: 25, clock: '10' },
        '18': { yards: 28, clock: '10' },
        '19': { yards: 32, clock: '10' },
        '20': { yards: 35, clock: '10' },
        '21': { yards: 38, clock: '10' },
        '22': { yards: 42, clock: '10' },
        '23': { yards: 45, clock: '10' },
        '24': { yards: 48, clock: '10' },
        '25': { yards: 52, clock: '10' },
        '26': { yards: 55, clock: '10' },
        '27': { yards: 58, clock: '10' },
        '28': { yards: 62, clock: '10' },
        '29': { yards: 65, clock: '10' },
        '30': { yards: 68, clock: '10' },
        '31': { yards: 72, clock: '10' },
        '32': { yards: 75, clock: '10' },
        '33': { yards: 78, clock: '10' },
        '34': { yards: 82, clock: '10' },
        '35': { yards: 85, clock: '10' },
        '36': { yards: 88, clock: '10' },
        '37': { yards: 92, clock: '10' },
        '38': { yards: 95, clock: '10' },
        '39': { yards: 99, clock: '10' },
      },
      doubles: {
        '1': { result: 'DEF_TD' },
        '20': { result: 'OFF_TD' },
        '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
      },
      meta: {
        oob_bias: false,
        field_pos_clamp: true,
        risk_profile: 'high',
        explosive_start_sum: 25,
      },
    };

    const result = MatchupTableSchema.safeParse(tableWithTurnover);
    expect(result.success).toBe(true);
  });

  it('should validate OOB bias outcomes', () => {
    const tableWithOOB: MatchupTable = {
      version: 'v1',
      off_card: 'SPREAD_BUBBLE_SCREEN',
      def_card: 'DEF_OUTSIDE_BLITZ',
      dice: '2d20',
      entries: {
        '3': { yards: -2, clock: '30', oob: true },
        '4': { yards: 5, clock: '20', oob: true },
        '5': { yards: 8, clock: '10', oob: false },
        // ... fill remaining entries
        '6': { yards: 2, clock: '20' },
        '7': { yards: 4, clock: '20' },
        '8': { yards: 6, clock: '20' },
        '9': { yards: 8, clock: '20' },
        '10': { yards: 10, clock: '20' },
        '11': { yards: 12, clock: '20' },
        '12': { yards: 14, clock: '20' },
        '13': { yards: 16, clock: '20' },
        '14': { yards: 18, clock: '20' },
        '15': { yards: 20, clock: '10' },
        '16': { yards: 22, clock: '10' },
        '17': { yards: 25, clock: '10' },
        '18': { yards: 28, clock: '10' },
        '19': { yards: 32, clock: '10' },
        '20': { yards: 35, clock: '10' },
        '21': { yards: 38, clock: '10' },
        '22': { yards: 42, clock: '10' },
        '23': { yards: 45, clock: '10' },
        '24': { yards: 48, clock: '10' },
        '25': { yards: 52, clock: '10' },
        '26': { yards: 55, clock: '10' },
        '27': { yards: 58, clock: '10' },
        '28': { yards: 62, clock: '10' },
        '29': { yards: 65, clock: '10' },
        '30': { yards: 68, clock: '10' },
        '31': { yards: 72, clock: '10' },
        '32': { yards: 75, clock: '10' },
        '33': { yards: 78, clock: '10' },
        '34': { yards: 82, clock: '10' },
        '35': { yards: 85, clock: '10' },
        '36': { yards: 88, clock: '10' },
        '37': { yards: 92, clock: '10' },
        '38': { yards: 95, clock: '10' },
        '39': { yards: 99, clock: '10' },
      },
      doubles: {
        '1': { result: 'DEF_TD' },
        '20': { result: 'OFF_TD' },
        '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
      },
      meta: {
        oob_bias: true, // Perimeter play with OOB bias
        field_pos_clamp: true,
        risk_profile: 'medium',
        explosive_start_sum: 25,
      },
    };

    const result = MatchupTableSchema.safeParse(tableWithOOB);
    expect(result.success).toBe(true);
  });
});
