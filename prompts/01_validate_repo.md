# 01_validate_repo.md — Validation Harness & Safety Rails

## Title & Goal
Add schema checks and repository guards before any migration to ensure data integrity and provide safety rails for the 2d20 dice engine migration.

## Context
**What exists:**
- Current deterministic card system in `src/rules/Charts.ts` and `src/rules/ResolvePlayCore.ts`
- Zod schemas already exist in `src/data/schemas/MatchupTable.ts` for 2d20 system
- Integration tests in `src/testing/integration/` with some TypeScript errors
- CI pipeline in `package.json` scripts

**What must change:**
- Add validation for 2d20 table entries (3–39 only, no gaps)
- Validate penalty tables have exactly 10 slots
- Ensure clock values are only {10,20,30}
- Add CI job to fail on invalid table structures
- Create golden tests with seeded RNG for current deterministic system
- Document validation rules in `/docs/validation.md`

## Inputs
- `src/data/schemas/MatchupTable.ts` (existing 2d20 schemas)
- `src/rules/Charts.ts` (current deterministic system)
- `src/sim/RNG.ts` (RNG implementation)
- `package.json` (CI scripts)

## Outputs
- `src/data/schemas/MatchupTable.ts` (enhanced with validation functions)
- `src/data/validators/` (new directory with table validators)
- `scripts/validate-tables.mjs` (CI validation script)
- `tests/golden/deterministic-baseline.json` (golden test baseline)
- `docs/validation.md` (validation documentation)
- `package.json` (updated CI scripts)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Maintain existing deterministic system functionality during validation phase

## Step-by-Step Plan
1. **Create table validators** - Pure functions to validate 2d20 table structure
2. **Add CI validation script** - Check all JSON tables for structural integrity
3. **Generate golden baseline** - Capture current deterministic outputs with seeded RNG
4. **Update package.json** - Add validation to CI pipeline
5. **Document validation rules** - Create comprehensive validation documentation

## Testing & Acceptance Criteria
- **Schema validation**: All existing tables pass new validators
- **CI integration**: `npm run validate-tables` completes without errors
- **Golden tests**: Deterministic outputs match baseline with seed `12345`
- **Type safety**: All new validators are strictly typed with no `any`
- **Performance**: Validation completes in < 500ms for all tables
- **CI passes**: `npm run ci` succeeds with new validation step

## Edge Cases
- **Missing entries**: Tables with gaps in 3-39 range should fail validation
- **Invalid clock values**: Clock values outside {10,20,30} should be rejected
- **Malformed JSON**: Invalid JSON structures should provide clear error messages
- **Empty tables**: Zero-entry tables should be handled gracefully
- **Future tables**: New tables should auto-validate on addition

## Docs & GDD Update
- Add "Validation Framework" section to GDD explaining the safety rails
- Document that migration cannot proceed without green validation
- Include validation checklist for future table authors

## Version Control
- **Branch name**: `feature/migration-validation-harness`
- **Commit format**:
  - `feat(data): add 2d20 table validators with strict schema checks`
  - `feat(tooling): add CI validation script for table integrity`
  - `test(golden): generate deterministic baseline for seeded RNG`
  - `docs(validation): comprehensive validation framework documentation`
- **PR description**: "Add validation harness and safety rails for 2d20 migration. Includes schema validators, CI checks, golden tests, and comprehensive documentation. Zero breaking changes to existing functionality."
- **Risks**: None - adds validation without modifying existing behavior
- **Rollback**: Remove new validators and CI steps, revert to previous validation state

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/data/schemas/MatchupTable.ts` (existing schemas to extend)
- `src/sim/RNG.ts` (RNG implementation for seeded tests)
