export function sleepFrame(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).requestAnimationFrame === 'function') {
        (window as any).requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    } catch {
      setTimeout(resolve, 0);
    }
  });
}

export function getLogText(): string {
  if (typeof document === 'undefined') return '';
  const el = document.getElementById('log');
  return (el && el.textContent) ? el.textContent : '';
}

export function setLogText(text: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('log');
  if (el) {
    el.textContent = text;
    (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
  }
}

export function $(id: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id) as any;
}


