// Legacy DOM/UI bootstrap side-effects
// The classic script initializes event listeners and game UI directly.
// We load it here as an ES module to preserve behavior during migration.
// @ts-expect-error: No type declarations for legacy script
await import('../../main.js');
export {};
//# sourceMappingURL=main-bridge.js.map