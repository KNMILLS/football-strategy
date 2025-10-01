### Contributing

- Run tests before submitting: `npm test`
- Follow TypeScript strict mode and ESLint rules
- Prefer pure functions with explicit RNG inputs for determinism
- Update golden baselines only when intended gameplay changes are approved
- Keep DOM IDs and CSS selectors stable to avoid UI regressions

### Project Rules & CI

- Read and follow `PROJECT_RULES.md` for architecture, testing, and UI/a11y rules.
- Before pushing, run local CI parity: `npm run ci`.
- Do not edit generated artifacts in `dist/**`, `coverage/**`, or `artifacts/**`.

