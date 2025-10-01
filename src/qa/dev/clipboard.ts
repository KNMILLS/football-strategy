import type { EventBus } from '../../utils/EventBus';
import { getLogText } from '../util/dom';

export async function copyLogToClipboard(_bus: EventBus): Promise<void> {
  const text = getLogText();
  try {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      await nav.clipboard.writeText(text);
      return;
    }
  } catch {}
  try {
    if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      (ta as any).select?.();
      try { (document as any).execCommand && (document as any).execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
  } catch {}
}


