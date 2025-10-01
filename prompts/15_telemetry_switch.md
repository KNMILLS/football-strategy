# 15_telemetry_switch.md — Outcome Logging for Tuning

## Title & Goal
Implement optional runtime telemetry logging that captures dice rolls, outcomes, penalty decisions, and game events as NDJSON for balance analysis and tuning, with configurable enablement for development and post-launch optimization.

## Context
**What exists:**
- Basic logging in `src/sim/LogFormat.ts`
- Event system in `src/utils/EventBus.ts`
- Balance analysis tools from prompt 09

**What must change:**
- Add structured telemetry collection for dice outcomes
- Implement NDJSON format for easy analysis tooling
- Create configurable logging levels (off/debug/production)
- Add privacy considerations for production deployment
- Enable correlation of game events for balance analysis

## Inputs
- `src/sim/LogFormat.ts` (existing logging patterns)
- `src/utils/EventBus.ts` (event system for telemetry hooks)
- `src/rules/ResolveDice.ts` (dice resolution for logging)

## Outputs
- `src/telemetry/` (new directory for logging system)
- `src/telemetry/TelemetryCollector.ts` (runtime event collection)
- `src/telemetry/NdJsonLogger.ts` (NDJSON formatting and output)
- `src/telemetry/PrivacyFilter.ts` (production-safe data handling)
- `src/config/TelemetryConfig.ts` (logging configuration and controls)
- `tests/telemetry/` (telemetry collection and formatting tests)
- `scripts/analyze-telemetry.mjs` (offline analysis tooling)
- `docs/telemetry-privacy-guide.md` (data handling and privacy documentation)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Telemetry must be optional and privacy-conscious

## Step-by-Step Plan
1. **Design telemetry schema** - Define structured data format for game events
2. **Implement event collector** - Runtime collection of dice and game events
3. **Add NDJSON formatter** - Structured output for analysis tooling
4. **Create privacy filters** - Safe data handling for production deployment
5. **Build configuration system** - Enable/disable controls for different environments
6. **Write comprehensive tests** - Telemetry accuracy and privacy validation

## Testing & Acceptance Criteria
- **Event capture**: All dice rolls, outcomes, and penalty decisions logged accurately
- **NDJSON format**: Output follows standard NDJSON specification for tooling compatibility
- **Performance impact**: Telemetry adds < 1ms overhead per event
- **Privacy compliance**: No sensitive user data included in production logs
- **Configuration**: Logging can be enabled/disabled per environment
- **Analysis tooling**: Provided scripts can process telemetry for balance insights
- **Storage efficiency**: Compact format suitable for long games
- **CI passes**: `npm run ci` succeeds with telemetry system

## Edge Cases
- **High-frequency events**: Performance under rapid dice resolution
- **Network issues**: Graceful handling when log destination unavailable
- **Large games**: Memory usage for extended gameplay sessions
- **Privacy boundaries**: Clear separation of game telemetry vs user data

## Docs & GDD Update
- Add "Telemetry System" section to GDD explaining logging for balance tuning
- Document NDJSON format and analysis workflow
- Include privacy considerations and data handling guidelines

## Version Control
- **Branch name**: `feature/migration-telemetry-system`
- **Commit format**:
  - `feat(telemetry): implement runtime event collection system`
  - `feat(telemetry): add NDJSON formatting for analysis tooling`
  - `feat(telemetry): create privacy filters for production deployment`
  - `feat(config): add telemetry configuration controls`
  - `feat(tools): build offline telemetry analysis scripts`
  - `test(telemetry): comprehensive logging and privacy tests`
  - `docs(telemetry): privacy and data handling documentation`
- **PR description**: "Implement optional telemetry system for dice engine tuning. Features structured NDJSON logging, privacy filters, configuration controls, and analysis tooling for ongoing balance optimization."
- **Risks**: None - telemetry is optional and privacy-conscious
- **Rollback**: Remove telemetry system, existing logging unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/sim/LogFormat.ts` (existing logging patterns to extend)
- `src/utils/EventBus.ts` (event system for telemetry integration)
- `gdd.md` (balance tuning and analysis requirements)
