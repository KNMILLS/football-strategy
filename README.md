## Gridiron Strategy — Modernized Runtime and TS Modules

### Scripts
- `npm run dev` — start Vite dev server
- `npm run test` — run Vitest in jsdom with coverage
- `npm run build` — TypeScript project references build + Vite bundle
- `npm run baseline` — regenerate golden baseline log (dev aid)

### Architecture
- Core rules live under `src/rules/**` and are pure, deterministic functions:
  - `Charts.ts`, `ResolvePlayCore.ts`, `ResultParsing.ts`, `Timekeeping.ts`, `Penalties.ts`
  - Special teams: `special/Kickoff.ts`, `special/Punt.ts`, `special/PlaceKicking.ts`
- Data schemas live under `src/data/schemas/**` and are validated via Zod.
- Deterministic RNG utilities in `src/sim/RNG.ts` (LCG); tests stub `Math.random`.
- A lightweight bootstrap in `src/index.ts` exposes modules on `window.GS` to allow
  the existing `main.js` runtime to gradually adopt the modular rules.

### Determinism & Golden Tests
- Do not use `Math.random()` directly in new code. Consume an injected `rng()`.
- Golden master tests (`tests/golden/simulateOneGame.test.ts`) set `Math.random` to a seeded LCG and evaluate `main.js`, ensuring logs and outcomes remain stable.
- Preserve all log strings and DOM IDs; tests compare outputs byte-for-byte.

### Running Locally
1) Install: `npm i`
2) Tests: `npm run test`
3) Build: `npm run build`
4) Dev server: `npm run dev` then open `http://localhost:5173` and smoke test

### Dev Mode
- Toggle via the checkbox in the header. When on, normal controls (`#controls-normal`) are hidden and test controls (`#controls-test`) are shown.
- You can force Dev Mode on page load by appending `#dev` to the URL (e.g., `http://localhost:5173/#dev`).
- Dev Mode provides: start test game, run full auto game, theme selection, SFX toggles, and debug log export.

### Troubleshooting
- If the New Game button or Dev Mode toggle appears unresponsive, ensure the dev server has compiled without errors and that `main.js` is being loaded. In this refactor, a legacy loader injects `main.js` after the DOM is ready.
- In tests or jsdom, external CSS (`style.css`) may warn about loading; this is harmless and does not affect logic.

### Coverage Gates
- Configured in `vitest.config.ts` with V8 coverage provider and thresholds.
- Adjust thresholds via `coverageThresholds` if refactors significantly move code.

### Release
- Update `CHANGELOG.md` with notable changes and dates.
- Tag with `vX.Y.Z` (see below for exact commands used in CI/release notes).



