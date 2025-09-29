export class LiveRegion {
  private polite: HTMLElement | null = null;
  private assertive: HTMLElement | null = null;

  constructor() {
    if (typeof document === 'undefined') return;
    this.polite = document.createElement('div');
    this.polite.setAttribute('aria-live', 'polite');
    this.polite.setAttribute('role', 'status');
    (this.polite as any).style.position = 'absolute';
    (this.polite as any).style.width = '1px';
    (this.polite as any).style.height = '1px';
    (this.polite as any).style.overflow = 'hidden';
    (this.polite as any).style.clip = 'rect(1px, 1px, 1px, 1px)';
    (this.polite as any).style.whiteSpace = 'nowrap';
    (this.polite as any).style.border = '0';
    (this.polite as any).style.padding = '0';
    (this.polite as any).style.margin = '0';

    this.assertive = document.createElement('div');
    this.assertive.setAttribute('aria-live', 'assertive');
    this.assertive.setAttribute('role', 'alert');
    (this.assertive as any).style.position = 'absolute';
    (this.assertive as any).style.width = '1px';
    (this.assertive as any).style.height = '1px';
    (this.assertive as any).style.overflow = 'hidden';
    (this.assertive as any).style.clip = 'rect(1px, 1px, 1px, 1px)';
    (this.assertive as any).style.whiteSpace = 'nowrap';
    (this.assertive as any).style.border = '0';
    (this.assertive as any).style.padding = '0';
    (this.assertive as any).style.margin = '0';

    document.body.appendChild(this.polite);
    document.body.appendChild(this.assertive);
  }

  announcePolite(text: string): void {
    if (!this.polite) return;
    this.polite.textContent = '';
    // Force text node update for screen readers
    setTimeout(() => { if (this.polite) this.polite.textContent = text; }, 30);
  }

  announceAssertive(text: string): void {
    if (!this.assertive) return;
    this.assertive.textContent = '';
    setTimeout(() => { if (this.assertive) this.assertive.textContent = text; }, 0);
  }
}

let singleton: LiveRegion | null = null;

export function ensureLiveRegion(): LiveRegion {
  if (!singleton) singleton = new LiveRegion();
  return singleton;
}

export function announcePolite(text: string): void {
  ensureLiveRegion().announcePolite(text);
}

export function announceAssertive(text: string): void {
  ensureLiveRegion().announceAssertive(text);
}


