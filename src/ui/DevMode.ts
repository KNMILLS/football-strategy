import { EventBus } from '../utils/EventBus';
import { getCurrentEngine, setEngine, getCurrentEngineInfo } from '../config/FeatureFlags';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

let registered = false;

export function registerDevMode(bus: EventBus): void {
  if (registered) return;
  registered = true;

  const devToggle = $('dev-mode-checkbox') as HTMLInputElement | null;
  const panel = $('controls-dev') as HTMLElement | null;
  const themeSelect = $('theme-select') as HTMLSelectElement | null;
  const sfxEnabled = $('sfx-enabled') as HTMLInputElement | null;
  const sfxVolume = $('sfx-volume') as HTMLInputElement | null;

  const playerDeck = $('dev-player-deck') as HTMLSelectElement | null;
  const aiDeck = $('dev-ai-deck') as HTMLSelectElement | null;
  const possession = $('dev-possession') as HTMLSelectElement | null;
  const seedInput = ((): HTMLInputElement | null => {
    // If the seed input is not present in HTML yet, create it inside the panel's top section
    const existing = document && document.getElementById('dev-seed');
    if (existing) return existing as HTMLInputElement;
    if (!panel || typeof document === 'undefined') return null;
    const row = document.createElement('div'); row.className = 'control-row';
    const label = document.createElement('label'); label.htmlFor = 'dev-seed'; label.textContent = 'Seed:';
    const input = document.createElement('input'); input.type = 'number'; (input as any).min = '1'; input.placeholder = 'random'; input.value = ''; input.id = 'dev-seed';
    row.appendChild(label); row.appendChild(input);
    panel.insertBefore(row, panel.firstChild);
    return input as HTMLInputElement;
  })();

  const startTestBtn = $('start-test-game') as HTMLButtonElement | null;
  const runAutoBtn = $('run-auto-game') as HTMLButtonElement | null;
  const copyLogBtn = $('copy-log') as HTMLButtonElement | null;
  const downloadBtn = $('download-debug') as HTMLButtonElement | null;

  // Create Engine Selection controls dynamically if panel exists
  const engineControls = ((): { container: HTMLElement | null; select: HTMLSelectElement | null; info: HTMLElement | null } => {
    if (!panel || typeof document === 'undefined') return { container: null, select: null, info: null };
    const container = document.createElement('div'); container.className = 'control-row';
    const label = document.createElement('label'); label.textContent = 'Engine:'; label.style.marginRight = '8px';
    const select = document.createElement('select'); select.id = 'engine-select';
    const deterministicOption = document.createElement('option'); deterministicOption.value = 'deterministic'; deterministicOption.textContent = 'Deterministic (Legacy)';
    const diceOption = document.createElement('option'); diceOption.value = 'dice'; diceOption.textContent = 'Dice (2d20)';
    select.appendChild(deterministicOption);
    select.appendChild(diceOption);
    select.style.marginRight = '8px';
    const info = document.createElement('span'); info.id = 'engine-info'; info.style.fontSize = '12px'; info.style.color = '#666';
    container.appendChild(label);
    container.appendChild(select);
    container.appendChild(info);
    panel.appendChild(container);
    return { container, select, info };
  })();

  // Create Validated Batch controls dynamically if panel exists
  const validatedBatch = ((): { container: HTMLElement | null; count: HTMLInputElement | null; chunk: HTMLInputElement | null; pat: HTMLSelectElement | null; run: HTMLButtonElement | null } => {
    if (!panel || typeof document === 'undefined') return { container: null, count: null, chunk: null, pat: null, run: null };
    const container = document.createElement('div'); container.className = 'control-row';
    const label = document.createElement('label'); label.textContent = 'Validated Batch:';
    label.style.marginRight = '8px';
    const count = document.createElement('input'); count.type = 'number'; (count as any).min = '1'; (count as any).max = '10000'; count.value = '100'; count.id = 'validated-batch-count'; count.title = 'Number of games';
    count.style.width = '6rem'; count.style.marginRight = '8px';
    const chunk = document.createElement('input'); chunk.type = 'number'; (chunk as any).min = '1'; (chunk as any).max = '1000'; chunk.value = '50'; chunk.id = 'validated-batch-chunk'; chunk.title = 'Chunk size';
    chunk.style.width = '5rem'; chunk.style.marginRight = '8px';
    const pat = document.createElement('select'); pat.id = 'validated-batch-pat'; pat.title = 'Player PAT policy';
    for (const v of ['auto','kick','two']) { const o = document.createElement('option'); o.value = v; o.textContent = v; pat.appendChild(o); }
    pat.style.marginRight = '8px';
    const run = document.createElement('button'); run.id = 'run-validated-batch'; run.textContent = 'Run Validated Batch';
    container.appendChild(label);
    container.appendChild(count);
    container.appendChild(chunk);
    container.appendChild(pat);
    container.appendChild(run);
    panel.appendChild(container);
    return { container, count, chunk, pat, run };
  })();

  // Initialize dev mode from localStorage and emit
  let devEnabled = false;
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('gs_dev_mode') : null;
    if (stored === '1') devEnabled = true;
  } catch (error) { /* ignore unavailable storage */ }
  if (devToggle) devToggle.checked = devEnabled;
  if (panel) {
    (panel as any).hidden = !devEnabled;
    (panel as HTMLElement).classList.toggle('hidden', !devEnabled);
    (panel as HTMLElement).setAttribute('aria-hidden', (!devEnabled).toString());
  }
  bus.emit('ui:devModeChanged', { enabled: devEnabled });

  // Engine indicator overlay disabled; rely on UI/gameplay cues instead

  if (devToggle) {
    devToggle.addEventListener('change', () => {
      const enabled = !!devToggle.checked;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('gs_dev_mode', enabled ? '1' : '0'); } catch (error) { /* ignore storage failures */ }
      if (panel) {
        (panel as any).hidden = !enabled;
        (panel as HTMLElement).classList.toggle('hidden', !enabled);
        (panel as HTMLElement).setAttribute('aria-hidden', (!enabled).toString());
      }
      bus.emit('ui:devModeChanged', { enabled });
    });
  }

  // Sync visibility on devModeChanged (idempotent)
  bus.on('ui:devModeChanged', ({ enabled }) => {
    try { (globalThis as any).GS = (globalThis as any).GS || {}; (globalThis as any).GS.__devMode = { enabled: !!enabled }; } catch (error) { /* ignore */ }
    if (panel) {
      (panel as any).hidden = !enabled;
      (panel as HTMLElement).classList.toggle('hidden', !enabled);
      (panel as HTMLElement).setAttribute('aria-hidden', (!enabled).toString());
    }
    if (devToggle) devToggle.checked = !!enabled;

    // Engine indicator overlay disabled; no-op visibility update
  });

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value as any;
      bus.emit('ui:themeChanged', { theme });
    });
  }

  if (sfxEnabled) {
    sfxEnabled.addEventListener('change', () => {
      bus.emit('ui:sfxToggle', { enabled: !!sfxEnabled.checked } as any);
    });
  }
  if (sfxVolume) {
    const handler = () => {
      const v = parseFloat(sfxVolume.value || '0.6');
      bus.emit('ui:sfxVolume', { volume: isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6 } as any);
    };
    sfxVolume.addEventListener('input', handler);
    sfxVolume.addEventListener('change', handler);
  }

  if (startTestBtn) {
    startTestBtn.addEventListener('click', () => {
      const provided = seedInput ? parseInt(seedInput.value || '0', 10) : 0;
      const seed = (isFinite(provided) && provided > 0) ? provided : (Date.now() % 1e9);
      const playerDeckVal = playerDeck ? playerDeck.value : 'Pro Style';
      const aiDeckVal = aiDeck ? aiDeck.value : 'Pro Style';
      const startingPossession = (possession ? possession.value : 'player') as 'player'|'ai';
      bus.emit('qa:startTestGame', {
        seed,
        playerDeck: playerDeckVal,
        aiDeck: aiDeckVal,
        startingPossession,
      } as any);
    });
  }

  if (runAutoBtn) {
    runAutoBtn.addEventListener('click', () => {
      const provided = seedInput ? parseInt(seedInput.value || '0', 10) : 0;
      if (isFinite(provided) && provided > 0) {
        bus.emit('qa:runAutoGame', { seed: provided, playerPAT: 'auto' } as any);
      } else {
        const seed = Date.now() % 1e9;
        bus.emit('qa:runAutoGame', { seed, playerPAT: 'auto' } as any);
      }
    });
  }

  if (copyLogBtn) {
    copyLogBtn.addEventListener('click', () => {
      bus.emit('qa:copyLog', {} as any);
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      bus.emit('qa:downloadDebug', {} as any);
    });
  }

  // Engine selection controls
  if (engineControls.select && engineControls.info) {
    // Initialize engine selection from current setting
    const currentEngine = getCurrentEngine();
    engineControls.select.value = currentEngine;

    // Update info display
    const updateEngineInfo = () => {
      const engineInfo = getCurrentEngineInfo();
      engineControls.info!.textContent = `${engineInfo.name} - ${engineInfo.description}`;
    };
    updateEngineInfo();

    // Handle engine selection changes
    engineControls.select.addEventListener('change', () => {
      const selectedEngine = engineControls.select!.value as 'deterministic' | 'dice';
      setEngine(selectedEngine);
      updateEngineInfo();
      bus.emit('ui:engineChanged', { engine: selectedEngine });
      // Force full UI reload to switch between engines cleanly
      try {
        if (typeof location !== 'undefined') {
          // Preserve dev hash if present
          const hasDev = (location.hash || '').includes('dev');
          if (hasDev) location.hash = '#dev';
          location.reload();
        }
      } catch { /* ignore */ }
    });
  }

  if (validatedBatch.run && validatedBatch.count && validatedBatch.pat) {
    validatedBatch.run.addEventListener('click', () => {
      const n = parseInt(validatedBatch.count!.value || '100', 10);
      const count = (isFinite(n) && n > 0) ? Math.min(n, 10000) : 100;
      const pat = (validatedBatch.pat!.value === 'kick' || validatedBatch.pat!.value === 'two') ? validatedBatch.pat!.value as any : 'auto';
      const seeds = Array.from({ length: count }, (_, i) => i + 1);
      const c = validatedBatch.chunk ? parseInt(validatedBatch.chunk.value || '50', 10) : 50;
      const chunkSize = (isFinite(c) && c > 0) ? Math.min(c, 1000) : 50;
      bus.emit('qa:runValidatedBatch', { seeds, playerPAT: pat, chunkSize } as any);
    });
  }

  // Optional keyboard shortcut: Alt+R to run auto game
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (!ev.altKey || (ev.key.toLowerCase() !== 'r')) return;
      const target = ev.target as HTMLElement | null;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      ev.preventDefault();
      const seed = seedInput ? parseInt(seedInput.value || '0', 10) : 0;
      if (seed > 0) bus.emit('qa:runAutoGame', { seed, playerPAT: 'auto' } as any);
      else bus.emit('qa:runBatch', { seeds: Array.from({ length: 100 }, (_, i) => i + 1), playerPAT: 'auto' } as any);
    });
  }
}


