# 02_schema_tables.md — Data Schemas for New Engine

## Title & Goal
Introduce JSON schemas for Off×Def matchup tables and penalty tables as specified in the new GDD, enabling type-safe data loading and validation for the 2d20 dice engine.

## Context
**What exists:**
- Basic Zod schemas in `src/data/schemas/MatchupTable.ts` for 2d20 system
- Current deterministic tables in `data/` directory (Pro Style, Ball Control, Aerial Style)
- Loader infrastructure in `src/data/loaders/` for existing tables
- Type definitions in `src/types/dice.ts` for new system

**What must change:**
- Extend existing schemas to match GDD specifications exactly
- Add loader functions for new table format
- Create type-safe accessors for matchup and penalty data
- Ensure backward compatibility with existing data structures
- Add runtime validation for all loaded tables

## Inputs
- `src/data/schemas/MatchupTable.ts` (existing basic schemas)
- `src/types/dice.ts` (type definitions for new system)
- `data/` directory (example table structures)
- `src/data/loaders/` (existing loader patterns)

## Outputs
- `src/data/schemas/MatchupTable.ts` (enhanced with complete GDD-compliant schemas)
- `src/data/loaders/matchupTables.ts` (loader for new Off×Def tables)
- `src/data/loaders/penaltyTables.ts` (loader for penalty tables)
- `src/data/schemas/validators.ts` (runtime validation functions)
- `tests/data/schemas/` (comprehensive schema tests)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Maintain existing deterministic system functionality during schema phase

## Step-by-Step Plan
1. **Enhance Zod schemas** - Update MatchupTable.ts to match GDD exactly
2. **Create table loaders** - Type-safe loaders for matchup and penalty tables
3. **Add runtime validators** - Pure functions to validate loaded data
4. **Write comprehensive tests** - 100% coverage of schema validation
5. **Update type exports** - Ensure all new types are properly exported

## Testing & Acceptance Criteria
- **Schema compliance**: All GDD requirements implemented in Zod schemas
- **Loader functionality**: Successfully load and validate existing table data
- **Type safety**: All loaders return strictly typed objects, no `any`
- **Runtime validation**: Invalid tables are caught at load time with clear errors
- **Performance**: Schema validation completes in < 100ms per table
- **CI passes**: `npm run ci` succeeds with new schema validation

## Edge Cases
- **Missing entries**: Tables without all 3-39 entries should fail validation
- **Invalid ranges**: Dice sums outside 3-39 should be rejected
- **Malformed turnovers**: Turnover objects with invalid return data should fail
- **Clock value errors**: Non-{10,20,30} clock values should be caught
- **OOB flag issues**: Invalid OOB boolean values should be rejected

## Docs & GDD Update
- Add "Data Schema" section to GDD explaining the new table format
- Document the validation requirements for future table authors
- Include examples of valid table structures

## Version Control
- **Branch name**: `feature/migration-data-schemas`
- **Commit format**:
  - `feat(data): enhance Zod schemas for complete GDD compliance`
  - `feat(data): add type-safe loaders for matchup and penalty tables`
  - `feat(data): implement runtime validators for loaded table data`
  - `test(data): comprehensive schema validation test coverage`
- **PR description**: "Implement complete data schemas for 2d20 dice engine. Includes GDD-compliant Zod schemas, type-safe loaders, runtime validators, and comprehensive test coverage. Zero breaking changes to existing functionality."
- **Risks**: None - adds new schemas without modifying existing behavior
- **Rollback**: Remove new schemas and loaders, revert to previous schema state

## References
- `/docs/agent_best_practices.md` (required reading)
- `gdd.md` (GDD specifications for table format)
- `src/types/dice.ts` (type definitions to align with)
- `src/data/loaders/` (existing loader patterns to follow)
