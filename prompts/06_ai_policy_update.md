# 06_ai_policy_update.md — Coach AI for New System

## Title & Goal
Update coach AI personas to select plays and make penalty decisions optimally under the new 2d20 distribution system, using EV calculations with seeded simulations for data-driven decision making.

## Context
**What exists:**
- Coach profiles in `src/ai/CoachProfiles.ts`
- Play selection logic in `src/ai/Playcall.ts` and `src/ai/PlayCaller.ts`
- Current AI using deterministic table lookups
- Basic tendency tracking in `src/ai/tendencies/`

**What must change:**
- Update coach profiles for new playbook system (West Coast, Spread, Air Raid, Smashmouth, Wide Zone)
- Implement EV calculations using seeded dice simulations (200 draws per candidate)
- Add penalty decision optimization (accept/decline based on game situation)
- Enhance tendency tracking for new play types and outcomes
- Maintain coach personality differentiation (Reid aggressive, Belichick conservative, Madden balanced)

## Inputs
- `src/ai/CoachProfiles.ts` (existing coach definitions)
- `src/ai/Playcall.ts` (current play selection logic)
- `src/types/dice.ts` (new dice system types)
- `src/rules/ResolveDice.ts` (dice resolver for EV calculations)
- `src/sim/RNG.ts` (seeded RNG for reproducible simulations)

## Outputs
- `src/ai/dice/` (new directory for dice-aware AI)
- `src/ai/dice/EVCalculator.ts` (expected value calculations via simulation)
- `src/ai/dice/PlaybookCoach.ts` (updated coach for new playbook system)
- `src/ai/dice/PenaltyAdvisor.ts` (optimal penalty decision making)
- `src/ai/dice/TendencyTracker.ts` (enhanced tendency tracking)
- `tests/ai/dice/` (comprehensive AI decision tests)
- `src/ai/index.ts` (export new AI components)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- AI decisions must be deterministic for same inputs (seeded RNG)

## Step-by-Step Plan
1. **Create EV calculation engine** - Simulate 200 outcomes per candidate play
2. **Update coach profiles** - Adapt personalities to new playbook system
3. **Implement penalty advisor** - Optimal accept/decline based on game state
4. **Enhance tendency tracking** - Track new play types and outcome patterns
5. **Add performance guardrails** - EV fallback for CI (100 draws vs 200) when budget exceeded
6. **Add decision validation** - Ensure AI choices align with coach profiles
7. **Write comprehensive tests** - Validate EV calculations and decision quality

## Testing & Acceptance Criteria
- **EV accuracy**: Simulated outcomes match theoretical distributions within 1%
- **Coach differentiation**: Reid aggressive, Belichick conservative, Madden balanced
- **Penalty optimization**: AI makes correct accept/decline decisions > 90% of time
- **Performance**: EV calculations complete in < 100ms per decision (with CI fallback to 100 draws)
- **Tendency learning**: AI adapts to player patterns across new playbooks
- **Decision consistency**: Same game state produces same AI choices (seeded)
- **Type safety**: All AI functions strictly typed, no `any` usage
- **CI passes**: `npm run ci` succeeds with new AI system

## Edge Cases
- **End game situations**: AI makes appropriate clock management decisions
- **Extreme scores**: AI adjusts risk tolerance based on score differential
- **Field position**: AI considers ball position in play selection
- **Down and distance**: AI appropriately values first downs vs. explosive plays
- **Opponent modeling**: AI tracks and counters player tendencies
- **Injury time**: AI adjusts strategy for limited time remaining

## Docs & GDD Update
- Add "Dice AI System" section to GDD explaining the EV-based approach
- Document coach profile updates for new playbook system
- Include performance characteristics and decision-making rationale

## Version Control
- **Branch name**: `feature/migration-ai-policies`
- **Commit format**:
  - `feat(ai): implement EV calculator with 200-draw simulations`
  - `feat(ai): update coach profiles for new playbook system`
  - `feat(ai): add optimal penalty decision advisor`
  - `feat(ai): enhance tendency tracking for dice outcomes`
  - `feat(ai): validate AI decisions against coach profiles`
  - `test(ai): comprehensive EV calculation and decision tests`
- **PR description**: "Update AI system for 2d20 dice engine with EV-based play selection and optimal penalty decisions. Maintains coach personality differentiation while leveraging seeded simulations for data-driven choices. Zero impact on existing deterministic AI."
- **Risks**: None - new AI runs parallel to existing system
- **Rollback**: Remove new AI directory, existing deterministic AI unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/ai/CoachProfiles.ts` (existing coach definitions to extend)
- `src/rules/ResolveDice.ts` (dice resolver for EV simulations)
- `gdd.md` (coach profile specifications for new system)
