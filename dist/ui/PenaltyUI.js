import { EventBus } from '../utils/EventBus';
const registeredBuses = new WeakSet();
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
function describePenalty(p, meta) {
    const side = p.on === 'defense' ? 'Defensive' : 'Offensive';
    const fd = p.firstDown && p.on === 'defense' ? ' (automatic first down)' : '';
    return `${side} penalty +${p.on === 'defense' ? p.yards : p.yards} yards${fd}`;
}
export function registerPenaltyUI(bus) {
    if (registeredBuses.has(bus))
        return;
    registeredBuses.add(bus);
    let activeDialog = null;
    let lastFocused = null;
    let keyHandler = null;
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
    function openDialog(data) {
        if (data.side !== 'player')
            return; // AI decides elsewhere
        const root = ensureRoot();
        if (!root)
            return;
        // Idempotency: close any existing
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
        desc.textContent = describePenalty(data.penalty, data.meta);
        const details = document.createElement('div');
        details.className = 'gs-penalty__details';
        const pre = document.createElement('p');
        pre.textContent = `Pre-play: ${downAndDistanceText(data.prePlay.down, data.prePlay.toGo, data.prePlay.ballOn, data.summary.possession)} at ${ballSpotText(data.prePlay.ballOn)}`;
        const acc = document.createElement('p');
        acc.textContent = `Accept: ${downAndDistanceText(data.accepted.down, data.accepted.toGo, data.accepted.ballOn, data.summary.possession)} at ${ballSpotText(data.accepted.ballOn)}`;
        const dec = document.createElement('p');
        dec.textContent = `Decline: ${downAndDistanceText(data.declined.down, data.declined.toGo, data.declined.ballOn, data.summary.possession)} at ${ballSpotText(data.declined.ballOn)}`;
        const flags = [];
        if (data.meta.halfDistanceCapped)
            flags.push('Half-the-distance cap applied');
        if (data.meta.untimedDownScheduled)
            flags.push('Untimed down will be played');
        if (data.meta.measuredFromMidfieldForLG)
            flags.push('Enforced from midfield due to Long Gain');
        const flagsEl = document.createElement('p');
        if (flags.length)
            flagsEl.textContent = flags.join(' • ');
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
            bus.emit && bus.emit('ui:choice.penalty', { decision });
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
        if (flags.length)
            wrap.appendChild(flagsEl);
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
            // Escape intentionally does nothing (decision required)
        };
        document.addEventListener('keydown', keyHandler);
    }
    bus.on && bus.on('flow:choiceRequired', (payload) => {
        if (!payload || payload.choice !== 'penaltyAcceptDecline')
            return;
        openDialog(payload.data);
    });
}
//# sourceMappingURL=PenaltyUI.js.map