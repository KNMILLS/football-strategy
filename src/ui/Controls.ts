import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

let registered = false;

export function registerControls(bus: EventBus): void {
  if (registered) return;
  registered = true;

  const newGameBtn = $('new-game') as HTMLButtonElement | null;
  const deckSelect = $('deck-select') as HTMLSelectElement | null;
  const opponentSelect = $('opponent-select') as HTMLSelectElement | null;
  const devModeCheckbox = $('dev-mode') as HTMLInputElement | null;
  const themeSelect = $('theme-select') as HTMLSelectElement | null;

  const patOptions = $('pat-options');
  const patKickBtn = $('pat-kick') as HTMLButtonElement | null;
  const patTwoBtn = $('pat-two') as HTMLButtonElement | null;

  const fgOptions = $('fg-options');
  const fgKickBtn = $('fg-kick') as HTMLButtonElement | null;

  // Initialize dev-mode from localStorage if present
  if (devModeCheckbox) {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('gs_dev_mode') : null;
      if (stored === '1' || stored === '0') {
        devModeCheckbox.checked = stored === '1';
      }
    } catch {}
  }

  // Wire New Game
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      const deckName = deckSelect && deckSelect.value ? deckSelect.value : '';
      const opponentName = opponentSelect && opponentSelect.value ? opponentSelect.value : '';
      bus.emit('ui:newGame', { deckName, opponentName });
    });
  }

  // Wire Dev Mode
  if (devModeCheckbox) {
    devModeCheckbox.addEventListener('change', () => {
      const enabled = !!devModeCheckbox.checked;
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('gs_dev_mode', enabled ? '1' : '0'); } catch {}
      bus.emit('ui:devModeChanged', { enabled });
    });
  }

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
}


