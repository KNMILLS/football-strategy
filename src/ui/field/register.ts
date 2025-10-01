import { EventBus } from '../../utils/EventBus';
import { ensureFieldChrome } from './chrome';
import { ensureFieldOverlays } from './overlays';
import type { OverlayOpts } from './overlayCards';
import { renderOverlayCard } from './overlayCards';
import { $ } from './utils';

export function registerField(bus: EventBus): void {
  console.log('Field component registering...');

  // Wait for DOM elements to be available
  const waitForElements = () => {
    const fieldElement = $('field-display');
    console.log('Field element found:', !!fieldElement);

    if (!fieldElement) {
      console.log('Field element not found, waiting...');
      setTimeout(waitForElements, 100);
      return;
    }

    console.log('Field element found, setting up field chrome...');

    // Ensure field chrome is built immediately
    ensureFieldChrome();

    // Set up overlays for VFX
    ensureFieldOverlays();

    console.log('Field component registered successfully');
  };

  waitForElements();

  // Set up event listeners after DOM is ready
  bus.on('vfx', ({ type, payload }) => {
    if (type === 'toast') {
      const overlay = $('vfx-overlay');
      if (!overlay) return;
      const d = document.createElement('div');
      d.className = 'vfx-toast';
      d.textContent = payload && payload.text ? String(payload.text) : '';
      overlay.appendChild(d);
      setTimeout(() => { d.remove(); }, 1500);
    }
  });

  (bus as any).on('field:overlayCard', (p: OverlayOpts) => {
    try { renderOverlayCard(p); } catch {}
  });
}


