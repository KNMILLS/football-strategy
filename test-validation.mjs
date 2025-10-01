import { validateTableSet } from './dist/data/validators/MatchupTableValidator.js';
import fs from 'fs';

async function testValidation() {
  console.log('🧪 Testing validation framework...\n');

  // Test 1: Empty validation should pass
  console.log('Test 1: Empty validation');
  const emptyResult = validateTableSet({});
  console.log(`✅ Result: ${emptyResult.isValid ? 'PASS' : 'FAIL'}`);
  console.log(`   Errors: ${emptyResult.errors.length}, Warnings: ${emptyResult.warnings.length}\n`);

  // Test 2: Card-based data should not be validated (no 2d20 tables)
  console.log('Test 2: Card-based data validation');
  const cardData = JSON.parse(fs.readFileSync('data/play_vs_defense_outcomes.json', 'utf8'));
  const cardResult = validateTableSet(cardData);
  console.log(`✅ Result: ${cardResult.isValid ? 'PASS (no 2d20 tables)' : 'UNEXPECTED FAIL'}`);
  console.log(`   Errors: ${cardResult.errors.length}, Warnings: ${cardResult.warnings.length}\n`);

  // Test 3: Invalid 2d20 structure should fail
  console.log('Test 3: Invalid 2d20 structure');
  const invalidTable = {
    'test-table': {
      version: '1.0.0',
      dice: '2d20',
      entries: {
        '3': { yards: 5, clock: '10' },
        '4': { yards: 3, clock: '20' },
        // Missing entries 5-39
      },
      doubles: {
        '1': { result: 'DEF_TD' },
        '20': { result: 'OFF_TD' },
        '2-19': { penalty_table_ref: 'test-penalties' }
      },
      meta: {
        oob_bias: true,
        field_pos_clamp: true,
        risk_profile: 'medium',
        explosive_start_sum: 25
      }
    }
  };
  const invalidResult = validateTableSet(invalidTable);
  console.log(`✅ Result: ${!invalidResult.isValid ? 'CORRECTLY FAILS' : 'UNEXPECTED PASS'}`);
  console.log(`   Errors: ${invalidResult.errors.length}`);
  if (invalidResult.errors.length > 0) {
    console.log(`   First error: ${invalidResult.errors[0]}`);
  }
  console.log('');

  console.log('🎉 Validation framework tests completed!');
}

testValidation().catch(err => console.error('❌ Test failed:', err.message));
