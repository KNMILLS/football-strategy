### Testing

- Unit tests for rules modules (Vitest, jsdom env where needed)
- Golden master: `tests/golden/simulateOneGame.test.ts` compares outputs of legacy `main.js` under seeded RNG to baselines in `tests/golden/baselines/`
- Generate/update baselines with `npm run baseline`
- UI contract test loads `index.html` and asserts DOM IDs remain stable

### Accessibility & cross‑browser notes

- Log region: `#log` has `role="log"` and `aria-live="polite"`; remains keyboard focusable via `tabindex="0"`.
- Buttons: `New Game`, PAT, 2PT, and FG controls have explicit `aria-label`s.
- Groups: `#pat-options` and `#fg-options` are `role="group"` with labels and toggle `aria-hidden` when shown/hidden.
- Focus: When PAT options open, focus moves to the first button. FG options do not steal focus when revealed.
- Keyboard: All interactive controls are operable via Tab/Shift+Tab; visible focus styles added using `:focus-visible`.
- Chrome/Firefox/Edge/Safari: Verified basic layout and focus rings. Minor CSS added for consistent focus visibility; no functional regressions observed.