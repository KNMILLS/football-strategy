# 14_two_minute_suite.md — Late-Game Scenario Tests

## Title & Goal
Create deterministic test suites for late-game clock management scenarios including sidelines, spikes, kneels, Hail Mary attempts, and penalty decisions under time pressure to ensure the dice engine handles end-game situations correctly.

## Context
**What exists:**
- Basic game flow testing in `src/testing/integration/`
- Clock management in `src/rules/Timekeeping.ts`
- Current deterministic system for baseline comparison

**What must change:**
- Add comprehensive two-minute drill scenarios
- Test clock edge cases (time expiring during plays)
- Validate penalty decisions in time-sensitive situations
- Ensure proper handling of desperation plays (Hail Mary, laterals)
- Create regression suite for ongoing clock management validation

## Inputs
- `src/rules/Timekeeping.ts` (existing clock logic)
- `src/testing/integration/` (existing test patterns)
- `src/domain/GameState.ts` (game state for scenario setup)

## Outputs
- `tests/scenarios/two-minute/` (late-game scenario test suites)
- `tests/scenarios/two-minute/ClockEdgeCases.ts` (time expiration during plays)
- `tests/scenarios/two-minute/DesperationPlays.ts` (Hail Mary, lateral attempts)
- `tests/scenarios/two-minute/PenaltyPressure.ts` (penalty decisions under time pressure)
- `tests/scenarios/two-minute/SidelineManagement.ts` (sideline and timeout scenarios)
- `scripts/run-two-minute-suite.mjs` (scenario execution and reporting)
- `docs/two-minute-testing-guide.md` (scenario documentation and maintenance)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Test scenarios must be deterministic and reproducible

## Step-by-Step Plan
1. **Design scenario framework** - Structure for defining late-game situations
2. **Implement clock edge cases** - Time expiration during play resolution
3. **Add desperation plays** - Hail Mary attempts and lateral situations
4. **Create penalty pressure tests** - Accept/decline decisions with seconds remaining
5. **Build sideline management** - Timeout and challenge scenarios
6. **Write comprehensive tests** - Scenario validation and regression testing

## Testing & Acceptance Criteria
- **Clock accuracy**: Time expiration handled correctly during play resolution
- **Desperation plays**: Hail Mary and lateral attempts resolve appropriately
- **Penalty decisions**: Accept/decline choices made correctly under time pressure
- **Sideline management**: Timeouts and challenges work in late-game scenarios
- **Scenario coverage**: Comprehensive coverage of two-minute drill situations
- **Deterministic results**: Same inputs produce identical outcomes
- **Performance**: Scenario execution completes in < 500ms per test
- **CI integration**: Two-minute suite runs in automated testing

## Edge Cases
- **Play during time expiration**: Clock hits 0 during dice resolution
- **Multiple laterals**: Complex desperation play sequences
- **Challenge deadlines**: Replay challenges under extreme time pressure
- **Simultaneous events**: Multiple game events occurring at once

## Docs & GDD Update
- Add "Two-Minute Testing" section to GDD explaining late-game validation
- Document scenario framework for future test authors
- Include examples of clock edge cases and desperation plays

## Version Control
- **Branch name**: `feature/migration-two-minute-suite`
- **Commit format**:
  - `feat(testing): create two-minute drill scenario framework`
  - `feat(testing): implement clock edge case validation`
  - `feat(testing): add desperation plays (Hail Mary, laterals) testing`
  - `feat(testing): create penalty decision pressure scenarios`
  - `feat(testing): build sideline management and timeout tests`
  - `test(scenarios): comprehensive two-minute suite validation`
  - `docs(two-minute): scenario documentation and maintenance guide`
- **PR description**: "Implement comprehensive two-minute drill test suite for dice engine. Features clock edge cases, desperation plays, penalty pressure scenarios, and sideline management validation for robust late-game handling."
- **Risks**: None - testing suite doesn't affect runtime gameplay
- **Rollback**: Remove two-minute test suite, existing testing unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/rules/Timekeeping.ts` (clock logic to validate)
- `src/testing/integration/` (existing test patterns to follow)
- `gdd.md` (late-game scenario requirements)
