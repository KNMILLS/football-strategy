# 07_commentary_tags.md — Tag-Driven Play-By-Play

## Title & Goal
Map dice outcome tags to dynamic play-by-play commentary templates, creating rich narrative descriptions for sacks, throwaways, turnovers with return yards, explosive plays, boundary situations, and near-touchdown moments.

## Context
**What exists:**
- Basic commentary system in `src/flow/narration/`
- Log formatting in `src/sim/LogFormat.ts`
- Event-driven narration in `src/flow/narration/Broadcast.ts`
- Current string-based result parsing

**What must change:**
- Create tag-to-phrasing mapping system for dice outcomes
- Implement template system for dynamic commentary generation
- Add context-aware phrasing (field position, score, time, down/distance)
- Support special cases (turnover returns, OOB, penalties, explosive plays)
- Enable stable snapshot testing for commentary consistency

## Inputs
- `src/flow/narration/` (existing commentary infrastructure)
- `src/types/dice.ts` (dice outcome tags)
- `src/sim/LogFormat.ts` (current log formatting)
- `src/domain/GameState.ts` (game context for commentary)

## Outputs
- `src/narration/dice/` (new directory for tag-driven commentary)
- `src/narration/dice/TagMapper.ts` (tag-to-template mapping system)
- `src/narration/dice/CommentaryEngine.ts` (context-aware phrase generation)
- `src/narration/dice/templates/` (template definitions with variants)
- `tests/narration/dice/` (commentary snapshot tests)
- `src/narration/index.ts` (export new commentary system)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Commentary must be deterministic for same inputs (seeded randomness for variety)

## Step-by-Step Plan
1. **Define tag system** - Create comprehensive tag vocabulary for dice outcomes
2. **Build template engine** - Context-aware phrase generation with variants
3. **Implement tag mapper** - Map dice result tags to appropriate templates
4. **Add context integration** - Include field position, score, time in commentary
5. **Create special case handlers** - Turnover returns, OOB, penalties (accept/decline/overrides), explosives
6. **Add snapshot testing** - Ensure commentary stability across runs

## Testing & Acceptance Criteria
- **Tag coverage**: All dice outcome tags have appropriate commentary
- **Context awareness**: Commentary reflects field position, score, and game situation
- **Variety**: Multiple phrasing options for each outcome type
- **Stability**: Same inputs produce consistent commentary (with controlled variety)
- **Performance**: Commentary generation completes in < 5ms per play
- **Special cases**: Turnovers, OOB, penalties (accept/decline/overrides), and explosives properly described
- **Template quality**: Natural-sounding, game-appropriate language
- **CI passes**: `npm run ci` succeeds with new commentary system

## Edge Cases
- **End zone situations**: Touchdown and safety commentary appropriate to context
- **Turnover returns**: Return yardage and final position clearly described
- **Clock management**: Time remaining and runoff properly communicated
- **Score impact**: Point differential and importance reflected in tone
- **Boundary plays**: OOB vs. in-bounds distinction clearly made

## Docs & GDD Update
- Add "Tag-Driven Commentary" section to GDD explaining the narrative system
- Document the template format and tag vocabulary
- Include examples of context-aware commentary generation

## Version Control
- **Branch name**: `feature/migration-commentary-tags`
- **Commit format**:
  - `feat(narration): implement tag-to-template mapping system`
  - `feat(narration): create context-aware commentary engine`
  - `feat(narration): add comprehensive template library with variants`
  - `feat(narration): integrate game state context into commentary`
  - `feat(narration): handle special cases (turnovers, OOB, penalties)`
  - `test(narration): snapshot testing for commentary stability`
- **PR description**: "Implement tag-driven commentary system for 2d20 dice outcomes. Features context-aware phrase generation, comprehensive template library, and stable snapshot testing. Enhances game narrative without affecting core resolution."
- **Risks**: None - new commentary runs parallel to existing narration
- **Rollback**: Remove new narration directory, existing system unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/flow/narration/` (existing commentary patterns)
- `src/types/dice.ts` (dice outcome tags to implement)
- `gdd.md` (commentary style and coverage requirements)
