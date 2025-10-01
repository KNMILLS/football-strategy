import { EventBus } from '../utils/EventBus';
class ModalManager {
    root = null;
    activeDialog = null;
    lastFocused = null;
    onKeydown = null;
    ensureRoot() {
        if (typeof document === 'undefined')
            return null;
        if (this.root && document.body.contains(this.root))
            return this.root;
        const existing = document.getElementById('gs-modal-root');
        if (existing) {
            this.root = existing;
            return existing;
        }
        const el = document.createElement('div');
        el.id = 'gs-modal-root';
        document.body.appendChild(el);
        this.root = el;
        return el;
    }
    showDialog(id, opts, onChoose) {
        const root = this.ensureRoot();
        if (!root)
            return;
        this.closeDialog();
        this.lastFocused = typeof document !== 'undefined' ? document.activeElement : null;
        const backdrop = document.createElement('div');
        backdrop.className = 'gs-modal__backdrop';
        backdrop.tabIndex = -1;
        const dialog = document.createElement('div');
        dialog.className = 'gs-modal__dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('data-dialog-id', id);
        const titleId = `gs-modal-title-${Date.now()}`;
        dialog.setAttribute('aria-labelledby', titleId);
        const wrap = document.createElement('div');
        wrap.className = 'gs-modal';
        const h = document.createElement('h2');
        h.id = titleId;
        h.textContent = opts.title;
        const msg = document.createElement('p');
        if (opts.message)
            msg.textContent = opts.message;
        const btnRow = document.createElement('div');
        btnRow.className = 'gs-modal__buttons';
        const buttons = [];
        for (const b of opts.buttons) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn gs-modal__button';
            btn.textContent = b.label;
            if (b.ariaLabel)
                btn.setAttribute('aria-label', b.ariaLabel);
            btn.addEventListener('click', () => {
                onChoose(b.id);
                this.closeDialog();
            });
            btnRow.appendChild(btn);
            buttons.push(btn);
        }
        wrap.appendChild(h);
        if (opts.message)
            wrap.appendChild(msg);
        wrap.appendChild(btnRow);
        dialog.appendChild(wrap);
        root.appendChild(backdrop);
        root.appendChild(dialog);
        this.activeDialog = dialog;
        // Focus management
        if (buttons.length > 0) {
            const firstBtn = buttons[0];
            if (firstBtn && typeof firstBtn.focus === 'function')
                firstBtn.focus();
        }
        // Trap focus within dialog
        const focusables = () => Array.from(dialog.querySelectorAll('button'));
        const keyHandler = (e) => {
            if (!this.activeDialog)
                return;
            const keys = focusables();
            if (keys.length === 0)
                return;
            const first = keys[0];
            const last = keys[keys.length - 1];
            if (e.key === 'Tab') {
                if (keys.length === 0)
                    return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                }
                else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
            // Hotkeys
            if (e.key && !e.ctrlKey && !e.metaKey && !e.altKey) {
                for (let i = 0; i < opts.buttons.length; i++) {
                    const spec = opts.buttons[i];
                    if (spec.hotkey && spec.hotkey.toLowerCase() === e.key.toLowerCase()) {
                        e.preventDefault();
                        buttons[i] && buttons[i].click();
                        break;
                    }
                }
            }
            // Space/Enter activate
            if (e.key === 'Enter' || e.key === ' ') {
                if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                    e.preventDefault();
                    document.activeElement.click();
                }
            }
        };
        this.onKeydown = keyHandler;
        document.addEventListener('keydown', keyHandler);
    }
    closeDialog() {
        if (!this.activeDialog)
            return;
        const dialog = this.activeDialog;
        const root = this.root;
        if (root) {
            const backdrop = root.querySelector('.gs-modal__backdrop');
            if (backdrop)
                backdrop.remove();
            dialog.remove();
        }
        if (this.onKeydown) {
            document.removeEventListener('keydown', this.onKeydown);
            this.onKeydown = null;
        }
        this.activeDialog = null;
        // Restore focus
        if (this.lastFocused && this.lastFocused.focus) {
            try {
                this.lastFocused.focus();
            }
            catch { }
        }
        this.lastFocused = null;
    }
}
export function registerSpecialTeamsUI(bus) {
    const modal = new ModalManager();
    // We rely on index.ts forwarding to a ui-level event name
    const anyBus = bus;
    if (anyBus.on) {
        anyBus.on('flow:choiceRequired', (payload) => {
            const kind = payload.choice;
            const data = payload.data || {};
            // Only open if human must choose
            if (kind === 'onsideOrNormal') {
                if (data.kicking !== 'player')
                    return;
                modal.showDialog('onsideOrNormal', {
                    title: 'Kickoff Type',
                    message: 'Choose kickoff type.',
                    buttons: [
                        { id: 'normal', label: 'Normal Kickoff (1)', hotkey: '1', ariaLabel: 'Normal Kickoff' },
                        { id: 'onside', label: 'Onside Kick (2)', hotkey: '2', ariaLabel: 'Onside Kick' },
                    ],
                }, (btnId) => {
                    anyBus.emit && anyBus.emit('ui:choice.kickoffType', { type: btnId });
                });
            }
            else if (kind === 'puntReturn') {
                if (data.receiving !== 'player')
                    return;
                const buttons = [];
                // In end zone: Return or Down at 20
                if (data.inEndZone) {
                    buttons.push({ id: 'return', label: 'Return (1)', hotkey: '1', ariaLabel: 'Return the punt' });
                    buttons.push({ id: 'downAt20', label: 'Down at 20 (2)', hotkey: '2', ariaLabel: 'Down at the 20' });
                }
                else {
                    buttons.push({ id: 'return', label: 'Return (1)', hotkey: '1', ariaLabel: 'Return the punt' });
                    buttons.push({ id: 'fairCatch', label: 'Fair Catch (2)', hotkey: '2', ariaLabel: 'Signal fair catch' });
                }
                modal.showDialog('puntReturn', {
                    title: 'Punt Return',
                    message: 'Choose how to handle the punt.',
                    buttons,
                }, (btnId) => {
                    anyBus.emit && anyBus.emit('ui:choice.puntReturn', { action: btnId });
                });
            }
            else if (kind === 'safetyFreeKick') {
                if (data.team !== 'player')
                    return;
                modal.showDialog('safetyFreeKick', {
                    title: 'Safety Restart',
                    message: 'Choose free-kick option.',
                    buttons: [
                        { id: 'kickoff+25', label: 'Kickoff +25 (1)', hotkey: '1', ariaLabel: 'Kickoff plus 25' },
                        { id: 'puntFrom20', label: 'Punt from 20 (2)', hotkey: '2', ariaLabel: 'Free kick punt from 20' },
                    ],
                }, (btnId) => {
                    anyBus.emit && anyBus.emit('ui:choice.safetyFreeKick', { action: btnId });
                });
            }
        });
    }
}
//# sourceMappingURL=SpecialTeamsUI.js.map