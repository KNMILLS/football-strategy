import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
let registered = false;
export function registerDevMode(bus) {
    if (registered)
        return;
    registered = true;
    const devToggle = $('dev-mode-checkbox');
    const panel = $('controls-test');
    const themeSelect = $('theme-select');
    const sfxEnabled = $('sfx-enabled');
    const sfxVolume = $('sfx-volume');
    const playerDeck = $('test-player-deck');
    const aiDeck = $('test-ai-deck');
    const possession = $('test-possession');
    const seedInput = (() => {
        // If the seed input is not present in HTML yet, create it inside the panel's top section
        const existing = document && document.getElementById('test-seed');
        if (existing)
            return existing;
        if (!panel || typeof document === 'undefined')
            return null;
        const row = document.createElement('div');
        row.className = 'control-row';
        const label = document.createElement('label');
        label.htmlFor = 'test-seed';
        label.textContent = 'Seed:';
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.value = '12345';
        input.id = 'test-seed';
        row.appendChild(label);
        row.appendChild(input);
        panel.insertBefore(row, panel.firstChild);
        return input;
    })();
    const startTestBtn = $('start-test-game');
    const runAutoBtn = $('run-auto-game');
    const copyLogBtn = $('copy-log');
    const downloadBtn = $('download-debug');
    // Initialize dev mode from localStorage and emit
    let devEnabled = false;
    try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('gs_dev_mode') : null;
        if (stored === '1')
            devEnabled = true;
    }
    catch { }
    if (devToggle)
        devToggle.checked = devEnabled;
    if (panel)
        panel.hidden = !devEnabled;
    bus.emit('ui:devModeChanged', { enabled: devEnabled });
    if (devToggle) {
        devToggle.addEventListener('change', () => {
            const enabled = !!devToggle.checked;
            try {
                if (typeof localStorage !== 'undefined')
                    localStorage.setItem('gs_dev_mode', enabled ? '1' : '0');
            }
            catch { }
            if (panel)
                panel.hidden = !enabled;
            bus.emit('ui:devModeChanged', { enabled });
        });
    }
    // Sync visibility on devModeChanged (idempotent)
    bus.on('ui:devModeChanged', ({ enabled }) => {
        if (panel)
            panel.hidden = !enabled;
        if (devToggle)
            devToggle.checked = !!enabled;
    });
    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            const theme = themeSelect.value;
            bus.emit('ui:themeChanged', { theme });
        });
    }
    if (sfxEnabled) {
        sfxEnabled.addEventListener('change', () => {
            bus.emit('ui:sfxToggle', { enabled: !!sfxEnabled.checked });
        });
    }
    if (sfxVolume) {
        const handler = () => {
            const v = parseFloat(sfxVolume.value || '0.6');
            bus.emit('ui:sfxVolume', { volume: isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6 });
        };
        sfxVolume.addEventListener('input', handler);
        sfxVolume.addEventListener('change', handler);
    }
    if (startTestBtn) {
        startTestBtn.addEventListener('click', () => {
            const seed = seedInput ? parseInt(seedInput.value || '12345', 10) : 12345;
            const playerDeckVal = playerDeck ? playerDeck.value : 'Pro Style';
            const aiDeckVal = aiDeck ? aiDeck.value : 'Pro Style';
            const startingPossession = (possession ? possession.value : 'player');
            bus.emit('qa:startTestGame', {
                seed,
                playerDeck: playerDeckVal,
                aiDeck: aiDeckVal,
                startingPossession,
            });
        });
    }
    if (runAutoBtn) {
        runAutoBtn.addEventListener('click', () => {
            const seed = seedInput ? parseInt(seedInput.value || '0', 10) : 0;
            if (seed > 0) {
                bus.emit('qa:runAutoGame', { seed, playerPAT: 'auto' });
            }
            else {
                const seeds = Array.from({ length: 100 }, (_, i) => i + 1);
                bus.emit('qa:runBatch', { seeds, playerPAT: 'auto' });
            }
        });
    }
    if (copyLogBtn) {
        copyLogBtn.addEventListener('click', () => {
            bus.emit('qa:copyLog', {});
        });
    }
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            bus.emit('qa:downloadDebug', {});
        });
    }
    // Optional keyboard shortcut: Alt+R to run auto game
    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', (ev) => {
            if (!ev.altKey || (ev.key.toLowerCase() !== 'r'))
                return;
            const target = ev.target;
            const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'select' || tag === 'textarea')
                return;
            ev.preventDefault();
            const seed = seedInput ? parseInt(seedInput.value || '0', 10) : 0;
            if (seed > 0)
                bus.emit('qa:runAutoGame', { seed, playerPAT: 'auto' });
            else
                bus.emit('qa:runBatch', { seeds: Array.from({ length: 100 }, (_, i) => i + 1), playerPAT: 'auto' });
        });
    }
}
//# sourceMappingURL=DevMode.js.map