// Bootstrap: attach to existing DOM per index.html and wire to modules
// For now, we keep runtime in main.js for parity. This file will gradually
// take over as we extract modules.

export function boot(): void {
  // Placeholder bootstrap. We'll migrate logic incrementally.
  // Keep IDs in index.html stable.
}

if (typeof window !== 'undefined') {
  // Optionally boot when using Vite dev server
  (window as any).GSBoot = boot;
}


