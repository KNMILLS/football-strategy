import { describe, it, expect, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Golden master harness: for now, we exercise current main.js through JSDOM by
// loading index.html to ensure DOM ids remain stable. We'll later swap to TS modules.

function resolveRootPath(rel: string): string {
  // Tests run from project root; resolve relative to CWD
  return path.resolve(process.cwd(), rel);
}

describe('UI contract', () => {
  beforeEach(async () => {
    const html = await readFile(resolveRootPath('index.html'), 'utf8');
    document.documentElement.innerHTML = html;
  });

  it('contains required DOM ids', () => {
    const required = [
      'score',
      'quarter',
      'clock',
      'downDistance',
      'ballSpot',
      'possession',
      'deck-select',
      'opponent-select',
      'new-game',
      'kick-pat',
      'go-two',
      'kick-fg',
      'log',
      'hand',
      'field-display',
    ];
    for (const id of required) {
      expect(document.getElementById(id), `missing #${id}`).toBeTruthy();
    }
  });
});


