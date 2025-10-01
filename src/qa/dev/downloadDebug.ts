import type { EventBus } from '../../utils/EventBus';
import { getLogText } from '../util/dom';
import { getDebugEntries, getDebugSeed } from '../debug/buffer';

export async function downloadDebug(_bus: EventBus, getVersion: () => string): Promise<void> {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      seedHint: getDebugSeed(),
      options: {},
      finalLog: getLogText(),
      debugLog: getDebugEntries(),
      version: (() => {
        try { return getVersion(); } catch { return 'dev'; }
      })(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = (window.URL || (window as any).webkitURL).createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gridiron-debug.json';
    document.body.appendChild(a);
    try { a.click(); } catch {}
    document.body.removeChild(a);
    try { (window.URL || (window as any).webkitURL).revokeObjectURL(url); } catch {}
  } catch {}
}


