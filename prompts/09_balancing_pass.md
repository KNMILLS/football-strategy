# 09_balancing_pass.md — Distribution Tuning Loop

## Title & Goal
Write a playtest script to automatically run simulations across all tables, flagging outliers versus GDD guardrails, and generate a comprehensive balance report for distribution tuning and validation.

## Context
**What exists:**
- Simulation infrastructure in `src/sim/`
- RNG implementation in `src/sim/RNG.ts`
- Current deterministic tables for baseline comparison
- Basic simulation runners in `src/sim/run/`

**What must change:**
- Create automated playtesting script for all dice tables
- Implement statistical analysis against GDD guardrails
- Generate detailed balance reports with outlier identification
- Provide tooling for ongoing balance maintenance
- Enable rapid iteration on table distributions

## Inputs
- `src/sim/` (existing simulation infrastructure)
- `data/tables_v1/` (dice tables from prompt 04)
- `src/rules/ResolveDice.ts` (dice resolver for simulations)
- `gdd.md` (guardrail specifications for distributions)

## Outputs
- `scripts/playtest-balance.mjs` (automated balance analysis script)
- `src/sim/balance/` (new directory for balance analysis tools)
- `src/sim/balance/Guardrails.ts` (GDD guardrail constants and definitions)
- `src/sim/balance/GuardrailChecker.ts` (GDD compliance validation)
- `src/sim/balance/StatisticalAnalyzer.ts` (distribution analysis engine)
- `src/sim/balance/ReportGenerator.ts` (balance report creation with violation explanations)
- `tests/sim/balance/` (balance analysis tests)
- `docs/balance-methodology.md` (balancing approach documentation)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Simulations must be deterministic and reproducible

## Step-by-Step Plan
1. **Create guardrail constants** - Define all GDD distribution requirements in `Guardrails.ts`
2. **Implement statistical analyzer** - Calculate key metrics per table
3. **Build simulation runner** - Automated playtesting across all tables
4. **Add outlier detection** - Flag tables outside acceptable ranges
5. **Generate balance reports** - Comprehensive analysis and recommendations
6. **Create maintenance tooling** - Easy re-running for ongoing balance

## Testing & Acceptance Criteria
- **Guardrail compliance**: All starter tables meet GDD distribution requirements
- **Statistical accuracy**: Analysis matches manual calculations within 0.1%
- **Performance**: Full analysis completes in < 30 seconds for 12 tables
- **Outlier detection**: Correctly identifies problematic distributions
- **Report quality**: Clear, actionable balance recommendations with specific guardrail constant references
- **Reproducibility**: Same seed produces identical analysis results
- **CI integration**: Balance check can run in CI pipeline
- **CI passes**: `npm run ci` succeeds with new balance tooling

## Edge Cases
- **Small sample sizes**: Statistical analysis handles limited simulation data
- **Edge distributions**: Extreme boom-bust tables analyzed correctly
- **Missing data**: Graceful handling when tables fail to load
- **Performance outliers**: Detection of computationally expensive tables
- **Report formatting**: Clear presentation of complex statistical data

## Docs & GDD Update
- Add "Balance Analysis" section to GDD explaining the tuning methodology
- Document the guardrails and acceptable distribution ranges
- Include examples of balance reports and tuning recommendations

## Version Control
- **Branch name**: `feature/migration-balance-analysis`
- **Commit format**:
  - `feat(sim): implement guardrail compliance checking`
  - `feat(sim): create statistical distribution analyzer`
  - `feat(sim): build automated playtesting simulation runner`
  - `feat(sim): add outlier detection and flagging system`
  - `feat(tools): generate comprehensive balance reports`
  - `docs(balance): methodology and guardrail documentation`
- **PR description**: "Implement automated balance analysis system for dice table distributions. Features statistical analysis, GDD guardrail compliance checking, outlier detection, and comprehensive reporting for ongoing balance maintenance."
- **Risks**: None - analysis tooling doesn't affect runtime gameplay
- **Rollback**: Remove balance directory, no existing functionality affected

## References
- `/docs/agent_best_practices.md` (required reading)
- `gdd.md` (distribution guardrails and balance requirements)
- `src/sim/` (existing simulation infrastructure to extend)
- `data/tables_v1/` (dice tables to analyze)
