import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
let registered = false;
export function registerControls(bus) {
    if (registered)
        return;
    registered = true;
    console.log('Controls component registering...');
    // Update deck selection dropdown based on current engine
    async function updateDeckSelectOptions() {
        if (typeof document === 'undefined')
            return;
        const deckSelect = $('deck-select');
        if (!deckSelect)
            return;
        // Use non-null assertion since we check for null above
        const deckSelectEl = deckSelect;
        const { getCurrentEngine } = await import('../config/FeatureFlags');
        const engine = getCurrentEngine();
        // Clear existing options
        deckSelectEl.innerHTML = '';
        if (engine === 'dice') {
            // Load dice engine playbooks
            // Dice engine playbooks are defined statically
            const playbooks = ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'];
            const playbookNames = playbooks;
            // Add playbook options
            playbookNames.forEach((playbookName, index) => {
                const option = document.createElement('option');
                option.value = playbookName;
                option.textContent = playbookName;
                if (index === 0)
                    option.selected = true; // Select first playbook by default
                deckSelectEl.appendChild(option);
            });
            // Update label
            const label = deckSelectEl.previousElementSibling;
            if (label)
                label.textContent = 'Playbook:';
        }
        else {
            // Legacy card decks
            addLegacyDeckOptions();
        }
        function addLegacyDeckOptions() {
            const legacyDecks = ['Pro Style', 'Ball Control', 'Aerial Style'];
            legacyDecks.forEach((deckName, index) => {
                const option = document.createElement('option');
                option.value = deckName;
                option.textContent = deckName;
                if (index === 0)
                    option.selected = true; // Select first option by default
                deckSelectEl.appendChild(option);
            });
            // Update label back to original
            const label = deckSelectEl.previousElementSibling;
            if (label)
                label.textContent = 'Offense Deck:';
        }
    }
    // Wait for DOM elements to be available
    const waitForElements = () => {
        if (typeof document === 'undefined') {
            return;
        }
        const newGameBtn = $('new-game');
        const deckSelect = $('deck-select');
        const opponentSelect = $('opponent-select');
        const devModeCheckbox = (document.getElementById('dev-mode') || document.getElementById('dev-mode-checkbox'));
        const themeSelect = $('theme-select');
        const patOptions = $('pat-options');
        const patKickBtn = (document.getElementById('pat-kick') || document.getElementById('kick-pat'));
        const patTwoBtn = (document.getElementById('pat-two') || document.getElementById('go-two'));
        const fgOptions = $('fg-options');
        const fgKickBtn = (document.getElementById('fg-kick') || document.getElementById('kick-fg'));
        console.log('Controls elements found:', {
            newGameBtn: !!newGameBtn,
            deckSelect: !!deckSelect,
            opponentSelect: !!opponentSelect,
            devModeCheckbox: !!devModeCheckbox
        });
        // Proceed even if some elements (like new game button) are missing
        if (!newGameBtn) {
            console.log('Controls: proceeding without new game button');
        }
        console.log('Controls elements found, setting up event handlers...');
        // Initialize dev-mode from localStorage if present
        if (devModeCheckbox) {
            try {
                const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('gs_dev_mode') : null;
                if (stored === '1' || stored === '0') {
                    devModeCheckbox.checked = stored === '1';
                }
            }
            catch { }
        }
        // Helper: render dice play options in left panel
        async function renderDicePlayOptions(playbook) {
            try {
                const container = document.getElementById('controls-normal');
                if (!container)
                    return;
                // Remove existing dice block if present
                const existing = document.getElementById('dice-play-options');
                if (existing)
                    existing.remove();
                // Create block
                const block = document.createElement('div');
                block.id = 'dice-play-options';
                block.className = 'control-row';
                block.style.marginBottom = '8px';
                block.style.marginTop = '4px';
                const title = document.createElement('div');
                title.textContent = `Plays (2d20) - ${playbook}:`;
                title.style.fontWeight = 'bold';
                title.style.fontSize = '12px';
                title.style.marginTop = '4px';
                title.style.marginBottom = '2px';
                block.appendChild(title);
                // Load playbook definitions (dice engine uses static data)
                const all = {
                    offensive: {
                        playbooks: {
                            'West Coast': [
                                { id: 'wc-quick-slant', label: 'Quick Slant', type: 'pass' },
                                { id: 'wc-screen-pass', label: 'Screen Pass', type: 'pass' },
                                { id: 'wc-stick-route', label: 'Stick Route', type: 'pass' },
                                { id: 'sm-power-o', label: 'Power O', type: 'run' },
                                { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' }
                            ],
                            'Spread': [
                                { id: 'spread-mesh-concept', label: 'Mesh Concept', type: 'pass' },
                                { id: 'spread-smash-route', label: 'Smash Route', type: 'pass' },
                                { id: 'spread-air-raid', label: 'Air Raid', type: 'pass' },
                                { id: 'spread-zone-read', label: 'Zone Read', type: 'run' }
                            ],
                            'Air Raid': [
                                { id: 'AIR_RAID_FOUR_VERTS', label: 'Four Verts', type: 'pass' },
                                { id: 'AIR_RAID_MILLS', label: 'Mills Concept', type: 'pass' },
                                { id: 'ar-spot', label: 'Spot Concept', type: 'pass' }
                            ],
                            'Smashmouth': [
                                { id: 'sm-power-o', label: 'Power O', type: 'run' },
                                { id: 'sm-counter', label: 'Counter', type: 'run' },
                                { id: 'sm-iso', label: 'Iso', type: 'run' }
                            ],
                            'Wide Zone': [
                                { id: 'wz-wide-zone', label: 'Wide Zone', type: 'run' },
                                { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' },
                                { id: 'wz-counter', label: 'Counter', type: 'run' }
                            ]
                        }
                    }
                };
                const list = all?.offensive?.playbooks?.[playbook] || [];
                if (list.length === 0) {
                    console.warn(`No plays found for playbook: ${playbook}`);
                    const noPlaysMsg = document.createElement('div');
                    noPlaysMsg.textContent = 'No plays available for this playbook';
                    noPlaysMsg.style.color = '#666';
                    noPlaysMsg.style.fontStyle = 'italic';
                    noPlaysMsg.style.padding = '8px 0';
                    block.appendChild(noPlaysMsg);
                    container.appendChild(block);
                    return;
                }
                const grid = document.createElement('div');
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
                grid.style.gap = '3px';
                grid.style.marginTop = '4px';
                grid.style.maxHeight = '200px';
                grid.style.overflowY = 'auto';
                for (const p of list) {
                    const btn = document.createElement('button');
                    btn.className = 'btn';
                    btn.style.justifyContent = 'flex-start';
                    btn.style.whiteSpace = 'normal';
                    btn.style.textAlign = 'left';
                    btn.style.padding = '4px';
                    btn.style.minHeight = '32px';
                    btn.title = p.description || p.label;
                    btn.innerHTML = `
            <div style="font-weight:600; font-size:10px; margin-bottom:1px">${p.label}</div>
            <div style="font-size:8px;opacity:.8; line-height:1.2">${p.description || ''}</div>
            <div style="font-size:7px;opacity:.6; margin-top:1px">
              ${p.type} • ${p.riskLevel} • ${p.averageYards}yds
            </div>
          `;
                    btn.addEventListener('click', () => {
                        // Emit as if a card was selected; use the play id as the cardId so dice engine can accept it
                        bus.emit('ui:playCard', { cardId: p.id });
                    });
                    grid.appendChild(btn);
                }
                block.appendChild(grid);
                container.appendChild(block);
            }
            catch (error) {
                console.warn('Failed to render dice play options:', error);
            }
        }
        // Wire New Game
        if (newGameBtn) {
            console.log('Setting up new game button event handler');
            newGameBtn.addEventListener('click', async () => {
                console.log('New game button clicked');
                const deckName = deckSelect && deckSelect.value ? deckSelect.value : '';
                const opponentName = opponentSelect && opponentSelect.value ? opponentSelect.value : '';
                console.log('Emitting new game event:', { deckName, opponentName });
                const { getCurrentEngine } = await import('../config/FeatureFlags');
                const engine = getCurrentEngine();
                // Toggle legacy hand visibility
                const handEl = $('hand');
                const previewEl = $('card-preview');
                if (engine === 'dice') {
                    if (handEl)
                        handEl.style.display = 'none';
                    if (previewEl)
                        previewEl.style.display = 'none';
                    // Render dice play options for the selected playbook
                    const selectedPlaybook = deckName || 'West Coast';
                    await renderDicePlayOptions(selectedPlaybook);
                }
                else {
                    const existing = document.getElementById('dice-play-options');
                    if (existing)
                        existing.remove();
                    if (handEl)
                        handEl.style.display = '';
                    if (previewEl)
                        previewEl.style.display = '';
                }
                bus.emit('ui:newGame', { deckName, opponentName });
            });
        }
        else {
            console.error('New game button not found!');
        }
        // Wire Dev Mode
        if (devModeCheckbox) {
            devModeCheckbox.addEventListener('change', () => {
                const enabled = !!devModeCheckbox.checked;
                try {
                    if (typeof localStorage !== 'undefined')
                        localStorage.setItem('gs_dev_mode', enabled ? '1' : '0');
                }
                catch { }
                bus.emit('ui:devModeChanged', { enabled });
            });
        }
        // Hide legacy hand when engine is dice (on load)
        try {
            import('../config/FeatureFlags').then(({ getCurrentEngine }) => {
                const isDice = getCurrentEngine() === 'dice';
                const handEl = $('hand');
                const previewEl = $('card-preview');
                if (isDice) {
                    if (handEl)
                        handEl.style.display = 'none';
                    if (previewEl)
                        previewEl.style.display = 'none';
                }
                else {
                    if (handEl)
                        handEl.style.display = '';
                    if (previewEl)
                        previewEl.style.display = '';
                }
            });
        }
        catch { }
        // Wire Theme select
        if (themeSelect) {
            themeSelect.addEventListener('change', () => {
                const theme = themeSelect.value;
                bus.emit('ui:themeChanged', { theme });
            });
        }
        // Wire PAT buttons
        if (patKickBtn) {
            patKickBtn.addEventListener('click', () => {
                if (patOptions && patOptions.hidden)
                    return;
                if (patKickBtn.disabled)
                    return;
                bus.emit('ui:choosePAT', { choice: 'kick' });
            });
        }
        if (patTwoBtn) {
            patTwoBtn.addEventListener('click', () => {
                if (patOptions && patOptions.hidden)
                    return;
                if (patTwoBtn.disabled)
                    return;
                bus.emit('ui:choosePAT', { choice: 'two' });
            });
        }
        // Wire FG button
        if (fgKickBtn) {
            fgKickBtn.addEventListener('click', () => {
                if (fgOptions && fgOptions.hidden)
                    return;
                if (fgKickBtn.disabled)
                    return;
                bus.emit('ui:attemptFieldGoal', {});
            });
        }
        // Keyboard shortcuts
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', (ev) => {
                const key = ev.key;
                if (key !== '1' && key !== '2' && key !== '3')
                    return;
                // Ignore when input/select/textarea is focused
                const target = ev.target;
                const tag = (target && target.tagName) ? target.tagName.toLowerCase() : '';
                if (tag === 'input' || tag === 'textarea' || tag === 'select')
                    return;
                if (key === '1') {
                    if (patOptions && !patOptions.hidden && patKickBtn && !patKickBtn.disabled) {
                        ev.preventDefault();
                        bus.emit('ui:choosePAT', { choice: 'kick' });
                    }
                }
                else if (key === '2') {
                    if (patOptions && !patOptions.hidden && patTwoBtn && !patTwoBtn.disabled) {
                        ev.preventDefault();
                        bus.emit('ui:choosePAT', { choice: 'two' });
                    }
                }
                else if (key === '3') {
                    if (fgOptions && !fgOptions.hidden && fgKickBtn && !fgKickBtn.disabled) {
                        ev.preventDefault();
                        bus.emit('ui:attemptFieldGoal', {});
                    }
                }
            });
        }
        // Subscribe to controls:update to toggle visibility/enabled state
        bus.on('controls:update', (p) => {
            if (patOptions)
                patOptions.hidden = !(p.awaitingPAT === true);
            if (fgOptions)
                fgOptions.hidden = !(p.showFG === true);
            const enabled = p.enabled !== false;
            if (patKickBtn)
                patKickBtn.disabled = !enabled;
            if (patTwoBtn)
                patTwoBtn.disabled = !enabled;
            if (fgKickBtn)
                fgKickBtn.disabled = !enabled;
            if (p.hints) {
                if (patKickBtn && p.hints.patKickHint)
                    patKickBtn.title = p.hints.patKickHint;
                if (patTwoBtn && p.hints.patTwoHint)
                    patTwoBtn.title = p.hints.patTwoHint;
                if (fgKickBtn && p.hints.fgHint)
                    fgKickBtn.title = p.hints.fgHint;
            }
        });
    };
    // Update deck options initially and listen for engine changes
    updateDeckSelectOptions();
    // Listen for engine changes to update deck options
    bus.on('ui:engineChanged', () => {
        updateDeckSelectOptions();
    });
    // Listen for deck selection changes to update dice play options
    const deckSelectElement = $('deck-select');
    if (deckSelectElement) {
        deckSelectElement.addEventListener('change', async () => {
            const { getCurrentEngine } = await import('../config/FeatureFlags');
            const engine = getCurrentEngine();
            if (engine === 'dice') {
                const selectedPlaybook = deckSelectElement.value;
                // Re-render dice play options for the selected playbook
                const container = document.getElementById('controls-normal');
                if (container) {
                    // Remove existing dice block if present
                    const existing = document.getElementById('dice-play-options');
                    if (existing)
                        existing.remove();
                    // Re-render with new playbook
                    const block = document.createElement('div');
                    block.id = 'dice-play-options';
                    block.className = 'control-row';
                    block.style.marginBottom = '8px';
                    block.style.marginTop = '4px';
                    const title = document.createElement('div');
                    title.textContent = `Plays (2d20) - ${selectedPlaybook}:`;
                    title.style.fontWeight = 'bold';
                    title.style.fontSize = '12px';
                    title.style.marginTop = '4px';
                    title.style.marginBottom = '2px';
                    block.appendChild(title);
                    // Load playbook definitions (dice engine uses static data)
                    const all = {
                        offensive: {
                            playbooks: {
                                'West Coast': [
                                    { id: 'wc-quick-slant', label: 'Quick Slant', type: 'pass' },
                                    { id: 'wc-screen-pass', label: 'Screen Pass', type: 'pass' },
                                    { id: 'wc-stick-route', label: 'Stick Route', type: 'pass' },
                                    { id: 'sm-power-o', label: 'Power O', type: 'run' },
                                    { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' }
                                ],
                                'Spread': [
                                    { id: 'spread-mesh-concept', label: 'Mesh Concept', type: 'pass' },
                                    { id: 'spread-smash-route', label: 'Smash Route', type: 'pass' },
                                    { id: 'spread-air-raid', label: 'Air Raid', type: 'pass' },
                                    { id: 'spread-zone-read', label: 'Zone Read', type: 'run' }
                                ],
                                'Air Raid': [
                                    { id: 'AIR_RAID_FOUR_VERTS', label: 'Four Verts', type: 'pass' },
                                    { id: 'AIR_RAID_MILLS', label: 'Mills Concept', type: 'pass' },
                                    { id: 'ar-spot', label: 'Spot Concept', type: 'pass' }
                                ],
                                'Smashmouth': [
                                    { id: 'sm-power-o', label: 'Power O', type: 'run' },
                                    { id: 'sm-counter', label: 'Counter', type: 'run' },
                                    { id: 'sm-iso', label: 'Iso', type: 'run' }
                                ],
                                'Wide Zone': [
                                    { id: 'wz-wide-zone', label: 'Wide Zone', type: 'run' },
                                    { id: 'wz-inside-zone', label: 'Inside Zone', type: 'run' },
                                    { id: 'wz-counter', label: 'Counter', type: 'run' }
                                ]
                            }
                        }
                    };
                    const list = all?.offensive?.playbooks?.[selectedPlaybook] || [];
                    if (list.length === 0)
                        return;
                    const grid = document.createElement('div');
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
                    grid.style.gap = '3px';
                    grid.style.marginTop = '4px';
                    for (const p of list) {
                        const btn = document.createElement('button');
                        btn.className = 'btn';
                        btn.style.justifyContent = 'flex-start';
                        btn.style.whiteSpace = 'normal';
                        btn.style.textAlign = 'left';
                        btn.style.padding = '4px';
                        btn.style.minHeight = '32px';
                        btn.innerHTML = `<div style="font-weight:600; font-size:10px">${p.label}</div><div style="font-size:8px;opacity:.8">${p.description || ''}</div>`;
                        btn.addEventListener('click', () => {
                            bus.emit('ui:playCard', { cardId: p.id });
                        });
                        grid.appendChild(btn);
                    }
                    block.appendChild(grid);
                    container.appendChild(block);
                }
            }
        });
    }
}
;
;
// Start waiting for elements
waitForElements();
//# sourceMappingURL=Controls.js.map