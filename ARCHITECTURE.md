### Architecture

- src/domain: core state (GameState)
- src/rules: rules engines (ResolvePlay WIP, Charts, ResultParsing, Penalties, Timekeeping)
- src/rules/special: Kickoff, Punt, PlaceKicking
- src/sim: RNG and simulation utilities
- src/ui: UI modules (planned) wired from src/index.ts
- src/data: schemas and loaders

Determinism: all pure resolvers accept an RNG function. Golden master tests exercise legacy main.js via jsdom to ensure parity during migration.
