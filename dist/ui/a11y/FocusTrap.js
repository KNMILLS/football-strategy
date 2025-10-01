function getFocusableElements(root) {
    const selectors = [
        'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
        'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object', 'embed',
        '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])'
    ];
    const nodes = Array.from(root.querySelectorAll(selectors.join(',')));
    return nodes.filter(n => !n.hasAttribute('inert') && n.offsetParent !== null);
}
export function activateFocusTrap(container) {
    const previousActive = typeof document !== 'undefined' ? document.activeElement : null;
    const keydown = (e) => {
        if (e.key !== 'Tab')
            return;
        const focusables = getFocusableElements(container);
        if (focusables.length === 0) {
            container.focus();
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last)
            return;
        const active = document.activeElement;
        if (e.shiftKey) {
            if (!active || active === first || !container.contains(active)) {
                last.focus();
                e.preventDefault();
            }
        }
        else {
            if (!active || active === last || !container.contains(active)) {
                first.focus();
                e.preventDefault();
            }
        }
    };
    document.addEventListener('keydown', keydown);
    const handle = {
        deactivate: () => {
            document.removeEventListener('keydown', keydown);
        },
        restoreFocus: () => {
            if (previousActive && previousActive.focus) {
                try {
                    previousActive.focus();
                }
                catch { }
            }
        }
    };
    return handle;
}
//# sourceMappingURL=FocusTrap.js.map