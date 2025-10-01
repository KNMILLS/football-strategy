# 04_seed_tables_minpack.md — Starter Tables for Playtests

## Title & Goal
Author a minimal pack of 12 Off×Def matchup tables demonstrating clumpy outcome distributions as specified in the GDD, providing starter content for playtesting the new 2d20 dice engine.

## Context
**What exists:**
- Current deterministic tables in `data/` (Pro Style, Ball Control, Aerial Style)
- Schema definitions in `src/data/schemas/MatchupTable.ts`
- Loader infrastructure in `src/data/loaders/`
- Validation framework from previous prompts

**What must change:**
- Create 12 new matchup tables covering key play types
- Implement "clumpy" distributions (boom-bust deep passes, consistent short game)
- Include OOB bias for perimeter plays
- Demonstrate turnover clustering and explosive play patterns
- Provide tables for playtesting and balance iteration

## Inputs
- `src/data/schemas/MatchupTable.ts` (schema definitions)
- `data/` directory (existing table examples for reference)
- `gdd.md` (specifications for clumpy distributions and play types)
- Current deterministic tables for balance reference

## Outputs
- `data/tables_v1/` (new directory for dice engine tables)
- `data/tables_v1/west-coast/` (West Coast matchup tables)
- `data/tables_v1/spread/` (Spread matchup tables)
- `data/tables_v1/air-raid/` (Air Raid matchup tables)
- `data/tables_v1/smashmouth/` (Smashmouth matchup tables)
- `data/tables_v1/wide-zone/` (Wide Zone matchup tables)
- `scripts/generate-table-stats.mjs` (analysis tool for distributions)
- `docs/table-design-guide.md` (authoring guide for future tables)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Tables must pass validation from previous prompts

## Step-by-Step Plan
1. **Design table archetypes** - Define 3 tables per playbook (West Coast, Spread, Air Raid, Smashmouth, Wide Zone) with distinct risk profiles
2. **Implement clumpy distributions** - Create boom-bust and consistent outcome clustering
3. **Add OOB bias** - Higher OOB rates for perimeter plays
4. **Balance turnover rates** - Tune interception and fumble frequencies
5. **Create analysis tools** - Script to validate distributions against guardrails
6. **Document table format** - Authoring guide for future table creation

## Testing & Acceptance Criteria
- **Distribution analysis**: %turnover/%≤0/%20+ histograms meet GDD guardrails for all five playbooks
- **Clumpy verification**: Statistical analysis shows outcome clustering
- **OOB bias**: Perimeter plays show higher OOB rates than interior plays
- **Schema compliance**: All tables pass validation from prompt 01
- **Loader integration**: Tables load correctly via new loader infrastructure
- **Playtest ready**: Tables provide interesting tactical choices
- **Performance**: Table loading completes in < 50ms per table
- **CI passes**: `npm run ci` succeeds with new table validation

## Edge Cases
- **Extreme field positions**: Tables work correctly at ball-on 0 and 100
- **Clock management**: 10/20/30 runoff applied correctly in all scenarios
- **Turnover variety**: Mix of INT/FUMBLE with appropriate return distributions
- **Penalty integration**: Doubles 2-19 correctly reference penalty tables
- **Tag variety**: Rich tag combinations for commentary system

## Docs & GDD Update
- Add "Starter Tables" section to GDD with distribution analysis
- Document the 12 table archetypes and their intended use
- Include statistical guardrails for future table authoring

## Version Control
- **Branch name**: `feature/migration-starter-tables`
- **Commit format**:
  - `feat(content): create 12 starter Off×Def tables for playtesting`
  - `feat(content): implement clumpy distributions with boom-bust patterns`
  - `feat(content): add OOB bias for perimeter plays`
  - `feat(tools): create distribution analysis script for table validation`
  - `docs(content): table design guide for future authors`
- **PR description**: "Add starter table pack for 2d20 dice engine playtesting. Includes 12 carefully designed Off×Def matchups with clumpy distributions, OOB bias, and comprehensive analysis tools. All tables validated and ready for playtesting."
- **Risks**: None - new tables don't affect existing functionality
- **Rollback**: Remove new table directory, no existing functionality affected

## References
- `/docs/agent_best_practices.md` (required reading)
- `gdd.md` (GDD specifications for table distributions and archetypes)
- `src/data/schemas/MatchupTable.ts` (schema requirements)
- `data/` (existing tables for balance reference)
