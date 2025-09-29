### Testing

- Unit tests for rules modules (Vitest, jsdom env where needed)
- Golden master: `tests/golden/simulateOneGame.test.ts` compares outputs of legacy `main.js` under seeded RNG to baselines in `tests/golden/baselines/`
- Generate/update baselines with `npm run baseline`
- UI contract test loads `index.html` and asserts DOM IDs remain stable
