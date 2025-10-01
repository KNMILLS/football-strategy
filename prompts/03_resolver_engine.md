# 03_resolver_engine.md — 2d20 Resolver + Doubles/Penalties

## Title & Goal
Implement the core `resolveSnap(offCard, defCard, state, rng)` function with 2d20 dice resolution, doubles mechanics, penalty handling, field position clamping, and OOB bias as specified in the GDD.

## Context
**What exists:**
- Basic type definitions in `src/types/dice.ts` for dice system
- Current deterministic resolver in `src/rules/ResolvePlayCore.ts`
- RNG implementation in `src/sim/RNG.ts`
- Game state management in `src/domain/GameState.ts`
- Penalty administration in `src/rules/PenaltyAdmin.ts`

**What must change:**
- Create new pure resolver function for 2d20 system
- Implement doubles routing (1-1 DEF TD, 20-20 OFF TD, 2–19 penalties)
- Add penalty override logic: 4/5/6 = forced override (no accept/decline), 2-19 = accept/decline choice
- Implement field position clamping and OOB → clock stop
- Apply 10/20/30 clock runoff per play (OOB/incompletions = 10", chain-movers = 20", normal runs = 30")
- Return structured result with yards/turnover/clock/OOB/tags

## Inputs
- `src/types/dice.ts` (dice types and interfaces)
- `src/domain/GameState.ts` (game state structure)
- `src/sim/RNG.ts` (RNG implementation)
- `src/rules/PenaltyAdmin.ts` (existing penalty logic)
- `src/data/schemas/MatchupTable.ts` (table schemas)

## Outputs
- `src/rules/ResolveDice.ts` (new dice resolver module with main `resolveSnap` function)
- `src/rules/DiceOutcome.ts` (outcome types and utilities)
- `tests/rules/dice-resolver/` (comprehensive resolver tests)
- `src/rules/index.ts` (export new resolver)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Core resolver must be pure function with no side effects

## Step-by-Step Plan
1. **Create dice outcome types** - Define structured result interfaces
2. **Implement core resolver** - Pure `resolveSnap` function with all GDD logic
3. **Add doubles handling** - Special case routing for 1-1 (DEF TD), 20-20 (OFF TD), 2-19 (penalty choice)
4. **Implement penalty logic** - 4/5/6 = forced override (no choice), 2-19 = accept/decline options
5. **Add field/OOB logic** - Position clamping and clock stop mechanics
6. **Write comprehensive tests** - 100% branch coverage including field edge cases (safety, goal-line TD, turnover returns)

## Testing & Acceptance Criteria
- **Branch coverage**: 100% coverage of all resolver logic paths
- **Doubles mechanics**: Correct routing for 1-1 (DEF TD), 20-20 (OFF TD), 2-19 (penalty choice)
- **Penalty overrides**: 4/5/6 = forced override (no accept/decline), 2-19 = accept/decline options
- **Clock semantics**: OOB/incompletions = 10", chain-movers = 20", normal runs = 30" (with seeded table verification)
- **Field clamping**: Ball position properly clamped to 0-100 range
- **OOB handling**: OOB plays stop clock, non-OOB continue normally
- **Clock runoff**: Correct 10/20/30 second application
- **Type safety**: All functions strictly typed, no `any` usage
- **Performance**: Resolver completes in < 10ms per call
- **CI passes**: `npm run ci` succeeds with new resolver

## Edge Cases
- **Safety scenarios**: Ball at own 1 with sack results in safety
- **Goal-line TDs**: Ball at opp 2 with big gain clamped to TD at 100
- **Turnover returns**: Return yards near goal lines (opp 5 INT return → TD)
- **End zone positions**: Ball at 0 or 100 with various outcome types
- **Penalty yardage**: Negative yards handled correctly in field clamping
- **Clock edge cases**: Clock runoff when already at 0 seconds
- **Double penalties**: Multiple penalty conditions in same play
- **Invalid inputs**: Malformed cards or state handled gracefully

## Docs & GDD Update
- Add "Dice Resolution Engine" section to GDD technical documentation
- Document the resolver function signature and behavior
- Include examples of all outcome types and edge cases

## Version Control
- **Branch name**: `feature/migration-dice-resolver`
- **Commit format**:
  - `feat(rules): implement core 2d20 dice resolver function`
  - `feat(rules): add doubles mechanics (1-1 DEF TD, 20-20 OFF TD, 2-19 penalty)`
  - `feat(rules): implement penalty override logic (4/5/6) and accept/decline`
  - `feat(rules): add field position clamping and OOB bias mechanics`
  - `test(rules): 100% branch coverage for dice resolver with edge cases`
- **PR description**: "Implement 2d20 dice resolution engine with doubles, penalties, field clamping, and OOB mechanics. Pure function with comprehensive test coverage. Zero impact on existing deterministic system."
- **Risks**: None - new resolver runs parallel to existing system
- **Rollback**: Remove new resolver files, no existing functionality affected

## References
- `/docs/agent_best_practices.md` (required reading)
- `gdd.md` (GDD specifications for dice mechanics)
- `src/types/dice.ts` (type definitions for resolver interface)
- `src/sim/RNG.ts` (RNG implementation for seeded resolution)
