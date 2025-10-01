# 11_feature_flags.md — Engine Toggle & Safe Rollout

## Title & Goal
Implement a configuration gate to switch between the deterministic card engine and the new 2d20 dice engine, enabling safe rollout, A/B testing, and fallback capabilities during the migration period.

## Context
**What exists:**
- Current deterministic system in `src/rules/ResolvePlayCore.ts`
- New dice system being implemented in prompts 02-04
- Settings system in `src/ui/DevMode.ts`

**What must change:**
- Create feature flag system for engine selection
- Add environment variable support for CI/deployment control
- Implement settings UI toggle for engine selection
- Add playtest screen showing active engine
- Enable seamless switching between engines for comparison
- Provide fallback mechanisms for dice engine issues

## Inputs
- `src/ui/DevMode.ts` (existing settings patterns)
- `src/rules/ResolvePlayCore.ts` (deterministic engine)
- `src/rules/ResolveDice.ts` (new dice engine from prompt 03)

## Outputs
- `src/config/FeatureFlags.ts` (feature flag system and configuration)
- `src/config/EngineSelector.ts` (engine selection and routing logic)
- `src/ui/settings/EngineToggle.ts` (settings UI for engine selection)
- `src/ui/playtest/EngineIndicator.ts` (playtest screen engine display)
- `tests/config/feature-flags/` (feature flag and engine switching tests)
- `src/index.ts` (integrate feature flag system)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Feature flags must maintain backward compatibility

## Step-by-Step Plan
1. **Create feature flag system** - Configuration management for engine selection
2. **Implement engine selector** - Routing logic between deterministic and dice engines
3. **Add environment support** - CI/deployment control via environment variables
4. **Create settings UI** - Toggle for manual engine selection
5. **Add playtest indicator** - Visual display of active engine during playtesting
6. **Write comprehensive tests** - Feature flag behavior and engine switching validation

## Testing & Acceptance Criteria
- **Engine switching**: Seamless toggle between deterministic and dice engines
- **Environment control**: `ENGINE=dice` or `ENGINE=deterministic` overrides UI setting
- **Settings persistence**: Engine selection persists across browser sessions
- **Playtest display**: Active engine clearly shown during gameplay
- **Fallback behavior**: Automatic fallback to deterministic if dice engine fails
- **Performance**: Engine switching adds < 1ms overhead
- **CI integration**: Feature flags work correctly in automated testing
- **Type safety**: All flag operations strictly typed, no `any` usage

## Edge Cases
- **Engine failures**: Graceful fallback when dice engine encounters errors
- **Invalid configurations**: Default to deterministic engine for safety
- **Mixed environments**: Different engines in different browser tabs/windows
- **State consistency**: Game state maintained when switching engines mid-game

## Docs & GDD Update
- Add "Feature Flags" section to GDD explaining the engine toggle system
- Document environment variable usage for CI/deployment
- Include migration rollout strategy using feature flags

## Version Control
- **Branch name**: `feature/migration-feature-flags`
- **Commit format**:
  - `feat(config): implement feature flag system for engine selection`
  - `feat(config): add engine selector with routing logic`
  - `feat(config): support environment variable control for CI`
  - `feat(ui): create settings toggle for engine selection`
  - `feat(ui): add playtest screen engine indicator`
  - `test(config): comprehensive feature flag and switching tests`
- **PR description**: "Implement feature flag system for safe dice engine rollout. Features engine toggle, environment control, settings UI, playtest indicators, and graceful fallback mechanisms."
- **Risks**: Low - feature flags enable safe testing without breaking existing functionality
- **Rollback**: Remove feature flag system, default to deterministic engine

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/ui/DevMode.ts` (existing settings patterns to follow)
- `src/rules/ResolvePlayCore.ts` (deterministic engine baseline)
- `src/rules/ResolveDice.ts` (dice engine to integrate)
