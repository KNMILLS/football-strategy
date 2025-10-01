export function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export function yardToPercent(absYard: number): number {
  return 5 + (absYard / 100) * 90;
}

export function selectField(container?: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (container) return container;
  return $('field-display');
}

export function setAriaHidden(el: HTMLElement): void {
  el.setAttribute('aria-hidden', 'true');
}

export function clampPercent(v: number, min = 5, max = 95): number {
  return Math.max(min, Math.min(max, v));
}


