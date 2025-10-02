### Testing

Testing infrastructure has been removed from this project.

### Accessibility & cross‑browser notes

- Log region: `#log` has `role="log"` and `aria-live="polite"`; remains keyboard focusable via `tabindex="0"`.
- Buttons: `New Game`, PAT, 2PT, and FG controls have explicit `aria-label`s.
- Groups: `#pat-options` and `#fg-options` are `role="group"` with labels and toggle `aria-hidden` when shown/hidden.
- Focus: When PAT options open, focus moves to the first button. FG options do not steal focus when revealed.
- Keyboard: All interactive controls are operable via Tab/Shift+Tab; visible focus styles added using `:focus-visible`.
- Chrome/Firefox/Edge/Safari: Verified basic layout and focus rings. Minor CSS added for consistent focus visibility; no functional regressions observed.