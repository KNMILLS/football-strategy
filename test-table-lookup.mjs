#!/usr/bin/env node

// Quick test to verify table lookup is working
import { EngineSelector } from './src/config/EngineSelector.ts';

const engine = new EngineSelector();

// Test the filename generation
console.log('Testing table filename generation...');

const testCases = [
  { offense: 'SP_BUBBLE', defense: 'Defense_Cover1' },
  { offense: 'SP_RPO_BUBBLE', defense: 'Defense_Cover2' },
];

for (const testCase of testCases) {
  const filename = engine.generateTableFilename(testCase.offense, testCase.defense);
  console.log(`Offense: ${testCase.offense}, Defense: ${testCase.defense} -> ${filename}`);

  // Check if file exists
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.join(process.cwd(), filename);
  const exists = fs.existsSync(fullPath);
  console.log(`  File exists: ${exists}`);
}
