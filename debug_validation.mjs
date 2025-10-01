import { validateMatchupTable } from './src/data/schemas/validators.ts';

const invalidTable = {
  version: 'v1',
  off_card: 'WEST_COAST_QUICK_SLANT',
  def_card: 'DEF_COVER_2',
  dice: '2d20',
  entries: {
    '3': { yards: 0, clock: '20' },
    '4': { yards: 2, clock: '20' },
    '5': { yards: 5, clock: '20' },
    '6': { yards: 2, clock: '20' },
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

console.log('Testing invalid table (missing some entries):');
const validation = validateMatchupTable(invalidTable);
console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);

// Also test with a complete table
const completeTable = {
  version: 'v1',
  off_card: 'WEST_COAST_QUICK_SLANT',
  def_card: 'DEF_COVER_2',
  dice: '2d20',
  entries: {
    '3': { yards: 0, clock: '20', turnover: { type: 'INT', return_yards: 15 } },
    '4': { yards: 2, clock: '20', turnover: { type: 'FUM', return_yards: 10 } },
    '5': { yards: 5, clock: '20', turnover: { type: 'INT', return_yards: 5 } },
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
    risk_profile: 'medium',
    explosive_start_sum: 25,
  },
};

console.log('\nTesting complete table:');
const completeValidation = validateMatchupTable(completeTable);
console.log('Valid:', completeValidation.valid);
console.log('Errors:', completeValidation.errors);
