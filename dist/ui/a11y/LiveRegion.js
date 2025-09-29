export class LiveRegion {
    polite = null;
    assertive = null;
    constructor() {
        if (typeof document === 'undefined')
            return;
        this.polite = document.createElement('div');
        this.polite.setAttribute('aria-live', 'polite');
        this.polite.setAttribute('role', 'status');
        this.polite.style.position = 'absolute';
        this.polite.style.width = '1px';
        this.polite.style.height = '1px';
        this.polite.style.overflow = 'hidden';
        this.polite.style.clip = 'rect(1px, 1px, 1px, 1px)';
        this.polite.style.whiteSpace = 'nowrap';
        this.polite.style.border = '0';
        this.polite.style.padding = '0';
        this.polite.style.margin = '0';
        this.assertive = document.createElement('div');
        this.assertive.setAttribute('aria-live', 'assertive');
        this.assertive.setAttribute('role', 'alert');
        this.assertive.style.position = 'absolute';
        this.assertive.style.width = '1px';
        this.assertive.style.height = '1px';
        this.assertive.style.overflow = 'hidden';
        this.assertive.style.clip = 'rect(1px, 1px, 1px, 1px)';
        this.assertive.style.whiteSpace = 'nowrap';
        this.assertive.style.border = '0';
        this.assertive.style.padding = '0';
        this.assertive.style.margin = '0';
        document.body.appendChild(this.polite);
        document.body.appendChild(this.assertive);
    }
    announcePolite(text) {
        if (!this.polite)
            return;
        this.polite.textContent = '';
        // Force text node update for screen readers
        setTimeout(() => { if (this.polite)
            this.polite.textContent = text; }, 30);
    }
    announceAssertive(text) {
        if (!this.assertive)
            return;
        this.assertive.textContent = '';
        setTimeout(() => { if (this.assertive)
            this.assertive.textContent = text; }, 0);
    }
}
let singleton = null;
export function ensureLiveRegion() {
    if (!singleton)
        singleton = new LiveRegion();
    return singleton;
}
export function announcePolite(text) {
    ensureLiveRegion().announcePolite(text);
}
export function announceAssertive(text) {
    ensureLiveRegion().announceAssertive(text);
}
//# sourceMappingURL=LiveRegion.js.map