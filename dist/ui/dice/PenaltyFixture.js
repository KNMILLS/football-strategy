import { EventBus } from '../../utils/EventBus';
/**
 * UI fixture for demonstrating penalty table behavior
 * Shows forced override vs accept/decline flows
 */
export function registerPenaltyFixture(bus) {
    let activeDialog = null;
    let lastFocused = null;
    let keyHandler = null;
    function $(id) {
        try {
            return typeof document !== 'undefined' ? document.getElementById(id) : null;
        }
        catch {
            return null;
        }
    }
    function ensureRoot() {
        if (typeof document === 'undefined')
            return null;
        const existing = document.getElementById('gs-modal-root');
        if (existing)
            return existing;
        const el = document.createElement('div');
        el.id = 'gs-modal-root';
        document.body.appendChild(el);
        return el;
    }
    function closeDialog() {
        if (!activeDialog)
            return;
        const root = document.getElementById('gs-modal-root');
        if (root) {
            const backdrop = root.querySelector('.gs-modal__backdrop');
            if (backdrop)
                backdrop.remove();
            activeDialog.remove();
        }
        if (keyHandler) {
            document.removeEventListener('keydown', keyHandler);
            keyHandler = null;
        }
        if (lastFocused && lastFocused.focus) {
            try {
                lastFocused.focus();
            }
            catch { }
        }
        activeDialog = null;
        lastFocused = null;
    }
    function downAndDistanceText(down, toGo, ballOn, possession) {
        const names = ['1st', '2nd', '3rd', '4th'];
        const idx = Math.min(4, Math.max(1, down)) - 1;
        const dn = names[idx] || `${down}th`;
        const firstDownAbs = possession === 'player' ? (ballOn + toGo) : (ballOn - toGo);
        const isG2G = possession === 'player' ? (firstDownAbs >= 100) : (firstDownAbs <= 0);
        const toGoLabel = isG2G ? 'Goal' : String(toGo);
        return `${dn} & ${toGoLabel}`;
    }
    function ballSpotText(ballOnAbs) {
        const display = ballOnAbs <= 50 ? ballOnAbs : 100 - ballOnAbs;
        return `HOME ${Math.round(display)}`;
    }
    function describePenalty(resolution) {
        const { penalty, tableEntry } = resolution;
        const side = penalty.on === 'defense' ? 'Defensive' : 'Offensive';
        const yards = penalty.yards > 0 ? `+${penalty.yards} yards` : `${penalty.yards} yards`;
        return `${side} penalty: ${tableEntry.label} (${yards})`;
    }
    function openForcedOverrideDialog(data) {
        const root = ensureRoot();
        if (!root)
            return;
        closeDialog();
        lastFocused = typeof document !== 'undefined' ? document.activeElement : null;
        const backdrop = document.createElement('div');
        backdrop.className = 'gs-modal__backdrop';
        backdrop.tabIndex = -1;
        const dialog = document.createElement('div');
        dialog.className = 'gs-modal__dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('data-dialog-id', 'penaltyForcedOverride');
        const titleId = `gs-modal-title-${Date.now()}`;
        const descId = `gs-modal-desc-${Date.now()}`;
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', descId);
        const wrap = document.createElement('div');
        wrap.className = 'gs-modal';
        const h = document.createElement('h2');
        h.id = titleId;
        h.textContent = 'Penalty — Forced Override';
        const desc = document.createElement('p');
        desc.id = descId;
        desc.textContent = `Play result overridden: ${describePenalty(data.resolution)}`;
        const details = document.createElement('div');
        details.className = 'gs-penalty__details';
        const info = document.createElement('p');
        info.innerHTML = `
      <strong>Important:</strong> This penalty forces an override of the original play result.
      No accept/decline choice is available - the penalty must be enforced.
    `;
        const pre = document.createElement('p');
        pre.textContent = `Pre-penalty: ${downAndDistanceText(data.prePlay.down, data.prePlay.toGo, data.prePlay.ballOn, data.summary.possession)} at ${ballSpotText(data.prePlay.ballOn)}`;
        const result = document.createElement('p');
        result.textContent = `Result: ${downAndDistanceText(data.accepted.down, data.accepted.toGo, data.accepted.ballOn, data.summary.possession)} at ${ballSpotText(data.accepted.ballOn)}`;
        const btnRow = document.createElement('div');
        btnRow.className = 'gs-modal__buttons';
        const btnOk = document.createElement('button');
        btnOk.type = 'button';
        btnOk.className = 'btn gs-modal__button';
        btnOk.textContent = 'OK (Enter)';
        btnOk.setAttribute('aria-label', 'Acknowledge the penalty');
        btnOk.addEventListener('click', () => {
            bus.emit && bus.emit('ui:penalty.fixture.acknowledged', { resolution: data.resolution });
            closeDialog();
        });
        btnRow.appendChild(btnOk);
        wrap.appendChild(h);
        wrap.appendChild(desc);
        wrap.appendChild(details);
        details.appendChild(info);
        details.appendChild(pre);
        details.appendChild(result);
        wrap.appendChild(btnRow);
        dialog.appendChild(wrap);
        root.appendChild(backdrop);
        root.appendChild(dialog);
        activeDialog = dialog;
        // Focus
        btnOk.focus();
        // Hotkeys
        keyHandler = (e) => {
            if (!activeDialog)
                return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btnOk.click();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                btnOk.click();
            }
        };
        document.addEventListener('keydown', keyHandler);
    }
    function openAcceptDeclineDialog(data) {
        const root = ensureRoot();
        if (!root)
            return;
        closeDialog();
        lastFocused = typeof document !== 'undefined' ? document.activeElement : null;
        const backdrop = document.createElement('div');
        backdrop.className = 'gs-modal__backdrop';
        backdrop.tabIndex = -1;
        const dialog = document.createElement('div');
        dialog.className = 'gs-modal__dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('data-dialog-id', 'penaltyAcceptDecline');
        const titleId = `gs-modal-title-${Date.now()}`;
        const descId = `gs-modal-desc-${Date.now()}`;
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', descId);
        const wrap = document.createElement('div');
        wrap.className = 'gs-modal';
        const h = document.createElement('h2');
        h.id = titleId;
        h.textContent = 'Penalty — Accept or Decline';
        const desc = document.createElement('p');
        desc.id = descId;
        desc.textContent = describePenalty(data.resolution);
        const details = document.createElement('div');
        details.className = 'gs-penalty__details';
        const pre = document.createElement('p');
        pre.textContent = `Pre-penalty: ${downAndDistanceText(data.prePlay.down, data.prePlay.toGo, data.prePlay.ballOn, data.summary.possession)} at ${ballSpotText(data.prePlay.ballOn)}`;
        const acc = document.createElement('p');
        acc.textContent = `Accept: ${downAndDistanceText(data.accepted.down, data.accepted.toGo, data.accepted.ballOn, data.summary.possession)} at ${ballSpotText(data.accepted.ballOn)}`;
        const dec = document.createElement('p');
        dec.textContent = `Decline: ${downAndDistanceText(data.declined.down, data.declined.toGo, data.declined.ballOn, data.summary.possession)} at ${ballSpotText(data.declined.ballOn)}`;
        const btnRow = document.createElement('div');
        btnRow.className = 'gs-modal__buttons';
        const btnAccept = document.createElement('button');
        btnAccept.type = 'button';
        btnAccept.className = 'btn gs-modal__button';
        btnAccept.textContent = 'Accept (1)';
        btnAccept.setAttribute('aria-label', 'Accept the penalty');
        const btnDecline = document.createElement('button');
        btnDecline.type = 'button';
        btnDecline.className = 'btn gs-modal__button';
        btnDecline.textContent = 'Decline (2)';
        btnDecline.setAttribute('aria-label', 'Decline the penalty');
        const choose = (decision) => {
            bus.emit && bus.emit('ui:penalty.fixture.choice', {
                decision,
                resolution: data.resolution
            });
            closeDialog();
        };
        btnAccept.addEventListener('click', () => choose('accept'));
        btnDecline.addEventListener('click', () => choose('decline'));
        btnRow.appendChild(btnAccept);
        btnRow.appendChild(btnDecline);
        wrap.appendChild(h);
        wrap.appendChild(desc);
        wrap.appendChild(details);
        details.appendChild(pre);
        details.appendChild(acc);
        details.appendChild(dec);
        wrap.appendChild(btnRow);
        dialog.appendChild(wrap);
        root.appendChild(backdrop);
        root.appendChild(dialog);
        activeDialog = dialog;
        // Focus
        btnAccept.focus();
        // Focus trap & hotkeys
        const focusables = () => [btnAccept, btnDecline].filter(Boolean);
        keyHandler = (e) => {
            if (!activeDialog)
                return;
            if (e.key === 'Tab') {
                const keys = focusables();
                const first = keys[0];
                const last = keys[keys.length - 1];
                if (!first || !last)
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
            if (e.key === '1') {
                e.preventDefault();
                btnAccept.click();
            }
            else if (e.key === '2') {
                e.preventDefault();
                btnDecline.click();
            }
            else if (e.key === 'Enter' || e.key === ' ') {
                if (document.activeElement?.tagName === 'BUTTON') {
                    e.preventDefault();
                    document.activeElement.click();
                }
            }
        };
        document.addEventListener('keydown', keyHandler);
    }
    // Listen for penalty fixture events
    bus.on && bus.on('ui:penalty.fixture.show', (payload) => {
        const data = payload.data;
        if (data.resolution.isForcedOverride) {
            openForcedOverrideDialog(data);
        }
        else {
            openAcceptDeclineDialog(data);
        }
    });
}
//# sourceMappingURL=PenaltyFixture.js.map