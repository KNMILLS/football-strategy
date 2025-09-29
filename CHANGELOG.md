## Unreleased

- Future: expand data-driven loaders for special teams tables
- Future: port remaining UI/runtime from `main.js` into modules

## v1.0.0 — 2025-09-29

- Tooling: TypeScript, Vite, Vitest, ESLint/Prettier, Zod
- Architecture: modularized rules under `src/rules/**` with clear inputs/outputs
- Data: Zod schemas for offense charts, place kicking, timekeeping under `src/data/schemas/**`
- Runtime: window bootstrap exposes modules via `window.GS` for incremental integration
- Tests: golden master harness and unit tests for rules; deterministic RNG via LCG
- Coverage: V8 coverage with thresholds enforced in `vitest.config.ts`
- Cleanup: removed or gated legacy branches behind module checks; preserved fallbacks to keep golden baselines stable
- Docs: updated README and architecture notes


