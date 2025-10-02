#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTableSet } from '../src/data/validators/MatchupTableValidator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively find all JSON files in a directory
 */
function findJsonFiles(dir) {
  const jsonFiles = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
      // Recurse into subdirectories, but skip common directories we don't want to validate
      jsonFiles.push(...findJsonFiles(fullPath));
    } else if (item.endsWith('.json')) {
      jsonFiles.push(fullPath);
    }
  }

  return jsonFiles;
}

/**
 * Load and parse a JSON file
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

/**
 * Validate a single JSON file
 */
function validateJsonFile(filePath) {
  try {
    const data = loadJsonFile(filePath);

    // If it's a single table (object with version field), wrap it in an object for validation
    const tableName = path.basename(filePath, '.json');
    const tablesToValidate = {};

    if (data.version && (data.dice === '2d20' || data.entries)) {
      // This is a single table file
      tablesToValidate[tableName] = data;
    } else if (typeof data === 'object' && data !== null) {
      // This might be a collection of tables
      Object.assign(tablesToValidate, data);
    }

    if (Object.keys(tablesToValidate).length > 0) {
      const result = validateTableSet(tablesToValidate);

      if (!result.isValid) {
        console.error(`❌ Validation failed for ${filePath}:`);
        result.errors.forEach(error => console.error(`  - ${error}`));
        return false;
      }

      if (result.warnings.length > 0) {
        console.warn(`⚠️  Warnings for ${filePath}:`);
        result.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      console.log(`✅ ${filePath} - Valid`);
      return true;
    }

    return null; // Not a table file, skip counting
  } catch (error) {
    console.error(`❌ Failed to validate ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating table structures...\n');

  // Find all JSON files in the data directory and subdirectories
  const dataDir = path.join(__dirname, '..', 'data');
  const jsonFiles = findJsonFiles(dataDir);

  console.log(`Found ${jsonFiles.length} JSON files to check\n`);

  let allValid = true;
  let validatedCount = 0;

  for (const filePath of jsonFiles) {
    const isValid = validateJsonFile(filePath, {});
    if (typeof isValid === 'boolean') { // Only count files that were actually validated
      validatedCount++;
      if (!isValid) {
        allValid = false;
      }
    }
  }

  console.log(`\n📊 Validation Summary:`);
  console.log(`  Files validated: ${validatedCount}`);
  console.log(`  Status: ${allValid ? '✅ All valid' : '❌ Some invalid'}`);

  if (!allValid) {
    console.error('\n💥 Validation failed! Please fix the errors above.');
    process.exit(1);
  }

  console.log('\n🎉 All table validations passed!');
  process.exit(0);
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as validateTables };
