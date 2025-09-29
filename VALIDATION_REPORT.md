## Validation Report — Gridiron Strategy (TS runtime)

Date: 2025-09-29

### Executive Summary
- **Status**: FAIL (release gated)
- **Blockers**:
  - Type errors in multiple files prevent build.
  - 11 failing tests: golden parity, invariants, watchdog, deck recycle, loader error-paths.
  - Lint not runnable (ESLint v9 config missing).
  - 1 moderate vulnerability in dependency audit.

### Commands Run and Evidence
- Environment
  - Node/npm: captured during install in shell; workspace: `C:\Gridiron-TS\Gridiron\gridiron_full_game`

- Typecheck
  - Command: `npm run typecheck`
  - Result: errors
  - Log: `artifacts/typecheck.log`

- Lint
  - Command: `npm run lint`
  - Result: failed to run — missing `eslint.config.js` (ESLint 9)
  - Log: `artifacts/lint.log`

- Tests
  - Command: `npm run test`
  - Result: 11 failing tests, 111 passing
  - Log: `artifacts/test.log`

- Coverage
  - Command: `npm run test:cov`
  - Result: coverage collected; multiple failures persist
  - Overall: see `coverage/coverage-summary.json`
  - Log: `artifacts/test-cov.log`

- Build
  - Command: `npm run build`
  - Result: failed due to TS errors
  - Log: `artifacts/build.log`

- Dependency Audit
  - Command: `npm audit --json`
  - Result: `{ info: 0, low: 0, moderate: 1, high: 0, critical: 0, total: 1 }`
  - Summary: `artifacts/audit-summary.txt`
  - Full JSON: `artifacts/audit.json`

- Bundle Size (dist)
  - Result: `dist total bytes 640168`
  - Summary: `artifacts/bundle-size.txt`

### Detailed Findings
- TypeScript errors (non-exhaustive):
  - `src/ai/Playcall.ts` — possibly undefined values (TS2532), type mismatch (TS2322).
  - `src/deck/Dealer.ts` — union `string | undefined` used as `string`; array concat types.
  - `src/index.ts` — extra property `createFlow` not in runtime type.
  - `src/qa/Harness.ts` — possibly undefined numeric params.
  - `src/sim/Simulator.ts` — `CoachProfile | undefined` assignments.
  - `src/ui/a11y/FocusTrap.ts` — possibly undefined `first/last`.
  - `src/ui/SpecialTeamsUI.ts` — possibly undefined `spec`, focusables.

- Test failures (highlights):
  - Golden parity: `tests/golden/simulateOneGame.test.ts` (4), `tests/golden/logSnapshot.test.ts` (1) — TS sim output deviates from baselines.
  - Invariants: `tests/rules/invariants.test.ts` (2) — `window.GS.start` undefined in jsdom path; legacy `evalMainJs` reference used in test.
  - Watchdog: `tests/runtime/boot_watchdog.test.ts` (1) — file URL scheme read of `index.html` failing.
  - Deck: `tests/deck/dealer_basic.test.ts` (1) — `recycleIfNeeded` doesn’t refill draw.
  - Loaders: `tests/data/loaders_result.test.ts` (2) — error-paths expected to return `{ ok:false }` but returning success.

- Coverage
  - Global coverage high (approx lines 90%), thresholds in `vitest.config.ts` are met, but test failures block release.

- Black-screen watchdog
  - `tests/runtime/smoke_black_screen.test.ts`: PASS
  - `tests/runtime/boot_watchdog.test.ts`: FAIL (URL must be of scheme file)

- Data availability
  - `tests/data/availability.test.ts`: PASS — loaders degrade to null; no crashes.
  - `tests/data/loaders_integration.test.ts`: PASS — `window.GS.tables` populated on success.

- Accessibility and keyboard
  - ARIA hooks present in UI (`#log` uses `role="log"`, `aria-live="polite"`).
  - No dedicated a11y test suite found for dialog roles/focus-trap; some focus-trap utilities exist but TS errors noted.

- Event contracts
  - `EventBus` usage consistent across UI and flow modules; no obvious missing handlers surfaced by tests. Recommend a static type map for events to eliminate `any` payloads.

- Legacy removal
  - Source: `src/**` contains no `legacy` or `main.js` references; `src/legacy/` is empty.
  - Residual mentions exist in `coverage/**` and `dist/**` artifacts only. Source passes legacy check.

- Structure hygiene
  - Circular deps scan skipped (madge not installed locally). Optional.
  - Dead code scan (ts-prune) not run. Optional.

- Performance sanity
  - Bundle size ~625 KB (raw). No analysis for duplicated deps performed.

### Feature‑Parity Matrix (sample)
| Original Feature | TS Modules | Tests/Assertions | Status |
| --- | --- | --- | --- |
| Scoreboard/HUD updates | `src/ui/HUD.ts`, `src/index.ts` bus emits | `tests/runtime/bootstrap.test.ts` | Pass |
| Field chrome (lines, markers) | `src/ui/Field.ts` | `tests/ui/field_chrome.test.ts` | Pass |
| Hand renders 5 cards + hover | `src/ui/Hand.ts`, `src/deck/Dealer.ts` | `tests/ui/hand_click.test.ts`, `tests/deck/dealer_basic.test.ts` | Partial (recycle fail) |
| PAT/FG controls | `src/ui/Controls.ts` | `tests/ui/controls_actions.test.ts` | Pass |
| Special Teams (KO/Punt/PK) | `src/rules/special/*` | `tests/rules/kickoff.test.ts`, `punt.test.ts`, `place_kicking.test.ts` | Pass |
| Penalties flow | `src/flow/GameFlow.ts` | `tests/flow/penalty_flow_integration.test.ts`, `tests/rules/penalties.test.ts` | Pass |
| Timekeeping and periods | `src/rules/Timekeeping.ts` | `tests/rules/two_minute_timekeeping.test.ts` | Pass |
| Golden simulator parity | `src/sim/Simulator.ts`, `src/index.ts` | `tests/golden/**` | Fail |
| AI play selection | `src/ai/*` | `tests/ai/playcall.test.ts`, `pat_decision.test.ts` | Pass |
| QA/Dev tools | `src/qa/Harness.ts`, `src/ui/DevMode.ts` | `tests/qa/harness_actions.test.ts` | Pass |
| VFX/SFX | `src/ui/VFX.ts`, `src/ui/SFX.ts` | `tests/ui/vfx.test.ts`, `sfx.test.ts` | Pass |
| Accessibility basics | `src/ui/*` (roles, aria-live) | — | Partial (need dialog/focus tests) |
| Data availability | `src/data/loaders/*` | `tests/data/availability.test.ts` | Pass |

### Action Items and Owners
1. Fix TS errors across `ai/Playcall`, `deck/Dealer`, `index`, `qa/Harness`, `sim/Simulator`, `ui/a11y/FocusTrap`, `ui/SpecialTeamsUI`. Severity: Critical. Owner: Runtime.
2. Add `eslint.config.js` (ESLint v9) and migrate ignores; re-run `npm run lint -- --max-warnings=0`. Severity: High. Owner: DX.
3. Golden parity: audit `src/sim/Simulator.ts` scoring cadence and PAT/TD logic; confirm intended TS behavior; update baselines only if behavior validated. Severity: Critical. Owner: Rules/Sim.
4. Invariants suite: ensure `window.GS` exposes `start` in jsdom path and remove legacy `evalMainJs` dependency in tests. Severity: High. Owner: Runtime/Tests.
5. `Dealer.recycleIfNeeded`: ensure discard reshuffle into draw; preserve immutability. Severity: High. Owner: Deck.
6. Loaders error-paths: return `{ ok:false, error: { code: 'SCHEMA' | 'TRANSFORM' } }` for malformed inputs. Severity: High. Owner: Data.
7. Watchdog fix: adjust `tests/runtime/boot_watchdog.test.ts` to read `index.html` via `new URL(..., import.meta.url)` with `file://` scheme or inline `body` fixture. Severity: Medium. Owner: Tests.
8. Security: address the 1 moderate `npm audit` finding or document as acceptable residual. Severity: Medium. Owner: Security/DX.
9. Accessibility: add tests for `role="dialog"`, `aria-modal`, labelled titles, focus-trap for `SpecialTeamsUI`/`PenaltyUI`; keyboard shortcuts scope. Severity: Medium. Owner: UI.
10. Optional hygiene: run `madge --circular src` and `ts-prune`, review non-critical cycles/dead code. Severity: Low. Owner: DX.

### Gate Decision
- With current blockers (type errors, test failures, build failure), the release is gated. Do not merge to `main`.

### Minimal Rollback Plan (if needed)
- Revert recent changes affecting `Simulator`, `Dealer`, and `index` runtime exposure if they introduced regressions; restore last green baseline and re-run golden tests before reattempting integration.

### Artifacts
- Logs: `artifacts/typecheck.log`, `artifacts/lint.log`, `artifacts/test.log`, `artifacts/test-cov.log`, `artifacts/build.log`
- Coverage: `coverage/` (HTML + JSON summary)
- Audit: `artifacts/audit.json`, `artifacts/audit-summary.txt`
- Bundle: `artifacts/bundle-size.txt`


