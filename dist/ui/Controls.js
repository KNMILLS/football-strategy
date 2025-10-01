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
    // Wait for DOM elements to be available
    const waitForElements = () => {
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
        if (!newGameBtn) {
            console.log('Controls elements not found, waiting...');
            setTimeout(waitForElements, 100);
            return;
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
        // Wire New Game
        if (newGameBtn) {
            console.log('Setting up new game button event handler');
            newGameBtn.addEventListener('click', () => {
                console.log('New game button clicked');
                const deckName = deckSelect && deckSelect.value ? deckSelect.value : '';
                const opponentName = opponentSelect && opponentSelect.value ? opponentSelect.value : '';
                console.log('Emitting new game event:', { deckName, opponentName });
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
    // Start waiting for elements
    waitForElements();
}
//# sourceMappingURL=Controls.js.map