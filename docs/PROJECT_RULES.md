## Project Rules for Cursor and CI

These rules align Cursor AI edits with this repository's architecture and CI.

### Workflow
- **Always run**: `npm run typecheck && npm run lint -- --max-warnings=0` before and after non-trivial edits.
- Prefer small, isolated edits in a single module.
- Never edit `dist/**`, `coverage/**`, `artifacts/**`, or `node_modules/**`.

### TypeScript & Determinism
- Use strict types; avoid `any` and unsafe casts.
- Never use `Math.random()`; inject RNG or use `src/sim/RNG.ts`.
- Keep core rules under `src/rules/**` pure; no DOM/browser access.
- Do not change `window.GS` public API without updating `README.md`.

### Imports & Structure
- Respect facade/barrel boundaries (e.g., `src/flow/GameFlow.ts`, `src/data/loaders/**`, `src/ui/**`).
- Prefer path resolution via `vite-tsconfig-paths`.
- Enforce import hygiene: imports first, no duplicates, blank line after imports.

### Linting & Formatting
- Follow `eslint.config.js` and Prettier. Fix all errors; avoid inline disables.
- `console` allowed; `debugger` forbidden; allow loop constants per config.
- Remove unused imports/variables.

### Data & Schemas
- JSON lives in `data/**` and is fetched from `/data/...` at runtime.
- Maintain Zod schemas in `src/data/schemas/**`; update loaders when evolving tables.

### UI & Accessibility
- Preserve DOM IDs, text, and ARIA roles (`#log[role="log"]`, `aria-live`, focus rules).
- Keep all interactive controls keyboard operable; use `:focus-visible`.
- Avoid UI changes that delay or remove critical DOM (`#scoreboard`, `#field-display`, `#log`).

### Performance & Flow
- Favor event-driven flows via `EventBus`; avoid nondeterministic timers/races.
- Keep control flow simple; avoid deep nesting and hidden side effects.

### Build & Dev
- Use Vite dev server on port 5173 (`npm run dev`); avoid custom servers.
- Keep `vite.config.ts` minimal; prefer plugins over ad-hoc bundler logic.

### CSS & Assets
- Do not rename/remove selectors/IDs referenced by UI.
- Place static assets under `assets/**`. Do not import from `dist/**`.

### Error Handling
- Use `src/ui/ErrorBoundary.ts` to surface errors; do not silently swallow exceptions.

### Commit & PR Checklist
- Run: `npm run ci` (typecheck, lint, rules coverage) before pushing.
- Summarize behavioral changes and attach updated baselines if outputs changed intentionally.
- Update `README.md`/`DATA_SCHEMA.md` when APIs/tables evolve.

### Quick Commands
- Lint/typecheck: `npm run typecheck && npm run lint -- --max-warnings=0`
- Full CI parity: `npm run ci`
- Update goldens intentionally: `npm run baseline`


