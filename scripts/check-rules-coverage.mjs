#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const summaryPath = path.resolve(process.cwd(), 'coverage', 'coverage-summary.json');
  let data;
  try {
    data = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  } catch (e) {
    console.error('Coverage summary not found at', summaryPath);
    process.exit(2);
  }
  const entries = Object.entries(data).filter(([k]) => k !== 'total');
  const ruleEntries = entries.filter(([file]) => file.replace(/\\/g, '/').includes('/src/rules/'));
  if (ruleEntries.length === 0) {
    console.warn('No files matched src/rules/** in coverage summary. Skipping rules coverage gate.');
    return;
  }
  let linesTotal = 0, linesCovered = 0;
  for (const [, metrics] of ruleEntries) {
    linesTotal += metrics.lines.total || 0;
    linesCovered += metrics.lines.covered || 0;
  }
  const pct = linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0;
  const threshold = 90;
  const pctStr = pct.toFixed(2);
  if (pct + 1e-9 < threshold) {
    console.error(`Rules coverage gate failed: lines ${pctStr}% < ${threshold}% over src/rules/**`);
    process.exit(1);
  } else {
    console.log(`Rules coverage gate passed: lines ${pctStr}% >= ${threshold}% over src/rules/**`);
  }
}

main();


