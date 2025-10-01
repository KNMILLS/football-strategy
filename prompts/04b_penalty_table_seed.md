# 04b_penalty_table_seed.md — Seed the d10 Penalty Table

## Title & Goal
Create the canonical d10 penalty table JSON with comprehensive coverage of NFL penalty types, implement the loader and type-safe accessors, and add a UI fixture to demonstrate 4/5/6 forced override behavior for end-to-end testing.

## Context
**What exists:**
- Penalty schema in `src/data/schemas/MatchupTable.ts`
- Penalty administration logic in `src/rules/PenaltyAdmin.ts`
- Penalty UI in `src/ui/PenaltyUI.ts`

**What must change:**
- Create comprehensive d10 penalty table covering NFL penalty scenarios
- Implement loader and validation for penalty table data
- Add type-safe penalty resolution for dice system integration
- Create UI fixture demonstrating forced override (4/5/6) vs accept/decline (2-19)
- Enable end-to-end testing of complete penalty flow

## Inputs
- `src/data/schemas/MatchupTable.ts` (penalty table schema)
- `src/rules/PenaltyAdmin.ts` (existing penalty administration)
- `src/ui/PenaltyUI.ts` (existing penalty UI patterns)

## Outputs
- `data/penalties/` (new directory for penalty table data)
- `data/penalties/nfl-penalties-v1.json` (comprehensive d10 penalty table)
- `src/data/loaders/penaltyTableLoader.ts` (type-safe penalty table loader)
- `src/rules/PenaltyResolver.ts` (dice system penalty resolution)
- `tests/data/penalties/` (penalty table loading and resolution tests)
- `src/ui/dice/PenaltyFixture.ts` (UI fixture for testing forced override behavior)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Penalty table must cover realistic NFL penalty scenarios

## Step-by-Step Plan
1. **Design penalty table** - Create comprehensive d10 table with NFL penalty types
2. **Implement penalty loader** - Type-safe loading and validation
3. **Add penalty resolver** - Integration with dice system for 2-19 and 4/5/6 cases
4. **Create UI fixture** - Demonstrate forced override (4/5/6) vs accept/decline (2-19)
5. **Write comprehensive tests** - Loading, resolution, and UI behavior testing
6. **Add integration tests** - End-to-end penalty flow validation

## Testing & Acceptance Criteria
- **Penalty coverage**: d10 table includes realistic NFL penalty scenarios (holding, PI, etc.)
- **Type safety**: All penalty operations strictly typed, no `any` usage
- **Forced override**: 4/5/6 results show informational modal (no accept/decline choice)
- **Accept/decline**: 2-19 doubles show proper choice interface
- **Loader validation**: Invalid penalty tables rejected at load time
- **UI fixture**: Demonstrates complete penalty flow for testing
- **Performance**: Penalty resolution completes in < 5ms
- **CI passes**: `npm run ci` succeeds with new penalty system

## Edge Cases
- **Invalid penalty data**: Malformed penalty tables handled gracefully
- **Edge penalty values**: Extreme yardage penalties (safety, long gains) work correctly
- **Replay scenarios**: Penalty replays maintain correct down/distance state
- **Multiple penalties**: Complex penalty scenarios resolved correctly

## Docs & GDD Update
- Add "Penalty System" section to GDD explaining the d10 table and resolution mechanics
- Document the forced override vs accept/decline distinction
- Include examples of penalty table format and usage

## Version Control
- **Branch name**: `feature/migration-penalty-table`
- **Commit format**:
  - `feat(data): create comprehensive d10 penalty table with NFL scenarios`
  - `feat(data): implement type-safe penalty table loader and validation`
  - `feat(rules): add penalty resolver for dice system integration`
  - `feat(ui): create penalty fixture for forced override demonstration`
  - `test(penalties): comprehensive penalty loading and resolution tests`
- **PR description**: "Implement complete penalty table system for 2d20 dice engine. Features comprehensive d10 penalty table, type-safe loading, forced override mechanics, and UI fixtures for end-to-end testing."
- **Risks**: None - penalty system runs parallel to existing logic
- **Rollback**: Remove penalty table and resolver, existing system unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/data/schemas/MatchupTable.ts` (penalty table schema requirements)
- `src/rules/PenaltyAdmin.ts` (existing penalty administration patterns)
- `gdd.md` (penalty mechanics specifications)
