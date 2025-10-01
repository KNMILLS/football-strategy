import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function loadIndexHtmlBody() {
  // Resolve absolute path then convert to file URL for readFileSync
  const abs = path.resolve(process.cwd(), 'index.html');
  const fileUrl = pathToFileURL(abs);
  const html = readFileSync(fileUrl, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : '';
  document.body.innerHTML = body;
}

async function waitFor(selector: string, timeoutMs = 1000): Promise<Element> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const el = document.querySelector(selector);
    if (el) return el;
    if (Date.now() - start > timeoutMs) throw new Error(`UI watchdog failed: missing ${selector}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('boot watchdog: index.html + TS runtime', () => {
  it('renders scoreboard, field, and log without black screen', async () => {
    loadIndexHtmlBody();
    await import('../../src/index.ts');
    await (window as any).GS.start();

    await waitFor('#scoreboard');
    await waitFor('#field-display');
    await waitFor('#log');
  });
});


