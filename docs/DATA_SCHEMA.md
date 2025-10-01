### Data Schemas

- OffenseCharts JSON: top-level key `OffenseCharts` with decks `ProStyle`, `BallControl`, `AerialStyle`. Each play maps defense letters A–J to result strings.
- Validated via Zod in `src/data/schemas/OffenseCharts.ts` and test `tests/data/schema_mappings.test.ts`.

Label mappings: UI labels map to JSON keys using `LABEL_TO_CHART_KEY` (e.g., `Run & Pass Option` -> `Run/Pass Option`, `Sideline Pass` -> `Side Line Pass`).


