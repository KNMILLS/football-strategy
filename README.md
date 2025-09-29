## Gridiron Strategy — Modernized Runtime and TS Modules

## Data files

- Location during development: `data/` at the repo root.
- Location in production build: emitted to `dist/data/` with the same relative paths.
- Runtime loads JSON tables via `fetch('data/*.json')` from the site root.

Adding/updating tables:
- Place JSON files under `data/`. On `npm run dev`, Vite serves them at `/data/...`.
- On `npm run build`, files are copied to `dist/data/` and fetched at runtime.

Fallback behavior:
- If any table is missing or invalid, the app still boots. Corresponding entries in `window.GS.tables` are set to `null`, and a concise log message is emitted (e.g., `Loaded offense charts ✓, place-kicking ✓, timekeeping ✕ (SCHEMA), long-gain ✓`).

CI/Tests:
- Tests stub `global.fetch` to provide deterministic inputs for loaders.
- The dev server requires `data/` reachable at `/data/...` for manual verification.

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
- Deterministic RNG utilities in `src/sim/RNG.ts` (LCG); never use `Math.random()` in code.
- TS-only runtime boot: `index.html` loads `src/index.ts` directly. Legacy `main.js` and `src/legacy/*` are removed.
- The runtime exposes a typed API on `window.GS` for UI, tests, and dev tools.

### Determinism & Tests
- Do not use `Math.random()` directly. Consume an injected `rng()`.
- Golden tests remain for legacy parity. New runtime tests boot via `src/index.ts` and assert core UI appears and `window.GS` API shape.
- Preserve all log strings and DOM IDs for accessibility and tests.

### Running Locally
1) Install: `npm i`
2) Tests: `npm run test`
3) Build: `npm run build`
4) Dev server: `npm run dev` then open `http://localhost:5173` and smoke test

### Dev Mode
- Toggle via the checkbox in the header. When on, normal controls (`#controls-normal`) are hidden and test controls (`#controls-test`) are shown.
- You can force Dev Mode on page load by appending `#dev` to the URL (e.g., `http://localhost:5173/#dev`).
- Dev Mode provides: start test game, run full auto game, theme selection, SFX toggles, and debug log export.

### TS-only Boot
- `index.html` includes: `<script type="module" src="/src/index.ts"></script>`.
- At runtime, `window.GS` provides:
  - `bus`: app `EventBus`
  - `rules`, `ai`: namespaced modules
  - `tables`: nullable tables preloaded on `start()`
  - `start(options)`, `dispose()`, `setTheme(theme)`
  - `runtime.resolvePlayAdapter(...)` for migration parity

### Troubleshooting
- **Black screen**: CI watchdog test fails if `#scoreboard`, `#field-display`, or `#log` are missing. Locally, run `npm run dev` and check console for table load messages.
- In tests/jsdom, external CSS (`style.css`) may warn; harmless.

### Coverage Gates
- Configured in `vitest.config.ts` with V8 coverage provider and thresholds.
- Adjust thresholds via `coverageThresholds` if refactors significantly move code.

### Release
- Update `CHANGELOG.md` with notable changes and dates.
- Tag with `vX.Y.Z` (see below for exact commands used in CI/release notes).



