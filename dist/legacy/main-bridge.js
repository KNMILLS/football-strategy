// Bridge to load legacy main.js logic after TS boot so it can use window.GS.bus
// This preserves the existing DOM structure and behavior while events are emitted.
try {
    await import('../../main.js');
}
catch (e) {
    // Non-fatal during tests where DOM may not exist
}
// Legacy DOM/UI bootstrap side-effects
// Load the classic script as a non-module to preserve legacy semantics and avoid strict-mode redeclaration errors.
export async function loadLegacyClassicScript() {
    if (typeof document === 'undefined')
        return;
    const url = new URL('../../main.js?url', import.meta.url).href;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = false; // preserve execution order
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load legacy main.js'));
        document.head.appendChild(s);
    });
}
await loadLegacyClassicScript();
//# sourceMappingURL=main-bridge.js.map