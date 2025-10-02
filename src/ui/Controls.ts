import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

let registered = false;

export function registerControls(bus: EventBus): void {
  if (registered) return;
  registered = true;

  console.log('Controls component registering...');

  // Update deck selection dropdown based on current engine
  async function updateDeckSelectOptions(): Promise<void> {
    if (typeof document === 'undefined') return;

    const deckSelect = $('deck-select') as HTMLSelectElement | null;
    if (!deckSelect) return;

    // Use non-null assertion since we check for null above
    const deckSelectEl = deckSelect!;

    const { getCurrentEngine } = await import('../config/FeatureFlags');
    const engine = getCurrentEngine();

    // Clear existing options
    deckSelectEl.innerHTML = '';

    if (engine === 'dice') {
      // Load dice engine playbooks
      fetch('data/cards/playbooks.json')
        .then(res => res.json())
        .then(data => {
          const playbooks = data?.offensive?.playbooks || {};
          const playbookNames = Object.keys(playbooks);

          // Add playbook options
          playbookNames.forEach((playbookName, index) => {
            const option = document.createElement('option');
            option.value = playbookName;
            option.textContent = playbookName;
            if (index === 0) option.selected = true; // Select first playbook by default
            deckSelectEl.appendChild(option);
          });

          // Update label
          const label = deckSelectEl.previousElementSibling as HTMLLabelElement | null;
          if (label) label.textContent = 'Playbook:';
        })
        .catch(error => {
          console.warn('Failed to load dice playbooks:', error);
          // Fallback to legacy options
          addLegacyDeckOptions();
        });
    } else {
      // Legacy card decks
      addLegacyDeckOptions();
    }

    function addLegacyDeckOptions(): void {
      const legacyDecks = ['Pro Style', 'Ball Control', 'Aerial Style'];
      legacyDecks.forEach((deckName, index) => {
        const option = document.createElement('option');
        option.value = deckName;
        option.textContent = deckName;
        if (index === 0) option.selected = true; // Select first option by default
        deckSelectEl.appendChild(option);
      });

      // Update label back to original
      const label = deckSelectEl.previousElementSibling as HTMLLabelElement | null;
      if (label) label.textContent = 'Offense Deck:';
    }
  }

  // Wait for DOM elements to be available
  const waitForElements = () => {
    if (typeof document === 'undefined') {
      return;
    }
    const newGameBtn = $('new-game') as HTMLButtonElement | null;
    const deckSelect = $('deck-select') as HTMLSelectElement | null;
    const opponentSelect = $('opponent-select') as HTMLSelectElement | null;
    const devModeCheckbox = (document.getElementById('dev-mode') || document.getElementById('dev-mode-checkbox')) as HTMLInputElement | null;
    const themeSelect = $('theme-select') as HTMLSelectElement | null;

    const patOptions = $('pat-options');
    const patKickBtn = (document.getElementById('pat-kick') || document.getElementById('kick-pat')) as HTMLButtonElement | null;
    const patTwoBtn = (document.getElementById('pat-two') || document.getElementById('go-two')) as HTMLButtonElement | null;

    const fgOptions = $('fg-options');
    const fgKickBtn = (document.getElementById('fg-kick') || document.getElementById('kick-fg')) as HTMLButtonElement | null;

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
      } catch {}
    }

    // Helper: render dice play options in left panel
    async function renderDicePlayOptions(playbook: string): Promise<void> {
      try {
        const container = document.getElementById('controls-normal');
        if (!container) return;

        // Remove existing dice block if present
        const existing = document.getElementById('dice-play-options');
        if (existing) existing.remove();

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

        // Load playbook definitions
        const res = await fetch('data/cards/playbooks.json');
        const all = await res.json();
        const list = (all?.offensive?.playbooks?.[playbook] as any[]) || [];

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
            bus.emit('ui:playCard', { cardId: p.id } as any);
          });
          grid.appendChild(btn);
        }
        block.appendChild(grid);
        container.appendChild(block);
      } catch (error) {
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
          if (handEl) (handEl as HTMLElement).style.display = 'none';
          if (previewEl) (previewEl as HTMLElement).style.display = 'none';
          // Render dice play options for the selected playbook
          const selectedPlaybook = deckName || 'West Coast';
          await renderDicePlayOptions(selectedPlaybook);
        } else {
          const existing = document.getElementById('dice-play-options');
          if (existing) existing.remove();
          if (handEl) (handEl as HTMLElement).style.display = '';
          if (previewEl) (previewEl as HTMLElement).style.display = '';
        }
        bus.emit('ui:newGame', { deckName, opponentName });
      });
    } else {
      console.error('New game button not found!');
    }

  // Wire Dev Mode
  if (devModeCheckbox) {
    devModeCheckbox.addEventListener('change', () => {
      const enabled = !!devModeCheckbox.checked;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('gs_dev_mode', enabled ? '1' : '0'); } catch {}
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
        if (handEl) (handEl as HTMLElement).style.display = 'none';
        if (previewEl) (previewEl as HTMLElement).style.display = 'none';
      } else {
        if (handEl) (handEl as HTMLElement).style.display = '';
        if (previewEl) (previewEl as HTMLElement).style.display = '';
      }
    });
  } catch {}

  // Wire Theme select
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value as any;
      bus.emit('ui:themeChanged', { theme });
    });
  }

  // Wire PAT buttons
  if (patKickBtn) {
    patKickBtn.addEventListener('click', () => {
      if (patOptions && (patOptions as any).hidden) return;
      if (patKickBtn.disabled) return;
      bus.emit('ui:choosePAT', { choice: 'kick' });
    });
  }
  if (patTwoBtn) {
    patTwoBtn.addEventListener('click', () => {
      if (patOptions && (patOptions as any).hidden) return;
      if (patTwoBtn.disabled) return;
      bus.emit('ui:choosePAT', { choice: 'two' });
    });
  }

  // Wire FG button
  if (fgKickBtn) {
    fgKickBtn.addEventListener('click', () => {
      if (fgOptions && (fgOptions as any).hidden) return;
      if (fgKickBtn.disabled) return;
      bus.emit('ui:attemptFieldGoal', {});
    });
  }

  // Keyboard shortcuts
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (ev: KeyboardEvent) => {
      const key = ev.key;
      if (key !== '1' && key !== '2' && key !== '3') return;
      // Ignore when input/select/textarea is focused
      const target = ev.target as HTMLElement | null;
      const tag = (target && target.tagName) ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (key === '1') {
        if (patOptions && !(patOptions as any).hidden && patKickBtn && !patKickBtn.disabled) {
          ev.preventDefault();
          bus.emit('ui:choosePAT', { choice: 'kick' });
        }
      } else if (key === '2') {
        if (patOptions && !(patOptions as any).hidden && patTwoBtn && !patTwoBtn.disabled) {
          ev.preventDefault();
          bus.emit('ui:choosePAT', { choice: 'two' });
        }
      } else if (key === '3') {
        if (fgOptions && !(fgOptions as any).hidden && fgKickBtn && !fgKickBtn.disabled) {
          ev.preventDefault();
          bus.emit('ui:attemptFieldGoal', {});
        }
      }
    });
  }

    // Subscribe to controls:update to toggle visibility/enabled state
    bus.on('controls:update', (p) => {
      if (patOptions) (patOptions as any).hidden = !(p.awaitingPAT === true);
      if (fgOptions) (fgOptions as any).hidden = !(p.showFG === true);
      const enabled = p.enabled !== false;
      if (patKickBtn) patKickBtn.disabled = !enabled;
      if (patTwoBtn) patTwoBtn.disabled = !enabled;
      if (fgKickBtn) fgKickBtn.disabled = !enabled;
      if (p.hints) {
        if (patKickBtn && p.hints.patKickHint) patKickBtn.title = p.hints.patKickHint;
        if (patTwoBtn && p.hints.patTwoHint) patTwoBtn.title = p.hints.patTwoHint;
        if (fgKickBtn && p.hints.fgHint) fgKickBtn.title = p.hints.fgHint;
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
    const deckSelectElement = $('deck-select') as HTMLSelectElement | null;
    if (deckSelectElement) {
      deckSelectElement.addEventListener('change', async () => {
        const { getCurrentEngine } = await import('../config/FeatureFlags');
        const engine = getCurrentEngine();
        if (engine === 'dice') {
          const selectedPlaybook = deckSelectElement!.value;
          // Re-render dice play options for the selected playbook
          const container = document.getElementById('controls-normal');
          if (container) {
            // Remove existing dice block if present
            const existing = document.getElementById('dice-play-options');
            if (existing) existing.remove();

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

            // Load playbook definitions
            fetch('data/cards/playbooks.json')
              .then(res => res.json())
              .then(all => {
                const list = (all?.offensive?.playbooks?.[selectedPlaybook] as any[]) || [];
                if (list.length === 0) return;

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
                    bus.emit('ui:playCard', { cardId: p.id } as any);
                  });
                  grid.appendChild(btn);
                }
                block.appendChild(grid);
                container.appendChild(block);
              })
              .catch(error => console.warn('Failed to load dice playbooks:', error));
          }
        }
      });
    }

    // Start waiting for elements
    waitForElements();
}


