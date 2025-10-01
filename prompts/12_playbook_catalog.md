# 12_playbook_catalog.md — Author 100 Card Definitions

## Title & Goal
Generate the complete offensive playbook catalog with 100 card definitions (20 cards × 5 playbooks) and defensive deck metadata, including names, descriptions, risk indicators, and perimeter bias markers for use by UI, AI, and card rendering systems.

## Context
**What exists:**
- Basic card type definitions in `src/types/dice.ts`
- Current deterministic card names for reference
- UI systems expecting card data (prompts 05, 08)

**What must change:**
- Create comprehensive card catalog for all five playbooks
- Define card metadata (names, descriptions, risk levels, perimeter bias)
- Include defensive deck definitions for universal defense system
- Structure data for easy consumption by UI and AI systems
- Enable card rendering and selection systems

## Inputs
- `src/types/dice.ts` (card type definitions)
- Current deterministic card names for inspiration
- `gdd.md` (playbook and card specifications)

## Outputs
- `data/cards/` (new directory for card catalog data)
- `data/cards/playbooks.json` (complete 100-card offensive catalog)
- `data/cards/defensive-deck.json` (10-card universal defensive definitions)
- `src/data/cards/CardCatalog.ts` (type-safe card data accessors)
- `src/data/cards/CardMetadata.ts` (card metadata types and interfaces)
- `tests/data/cards/` (card catalog loading and validation tests)
- `docs/card-catalog-spec.md` (card definition format and authoring guide)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Card definitions must be realistic and balanced for football strategy

## Step-by-Step Plan
1. **Design card archetypes** - Define play types and risk profiles for each playbook
2. **Create offensive catalog** - 20 cards per playbook (West Coast, Spread, Air Raid, Smashmouth, Wide Zone)
3. **Define defensive deck** - 10-card universal defensive system
4. **Add metadata structure** - Risk indicators, perimeter bias, descriptions
5. **Implement type-safe accessors** - Card catalog loading and querying
6. **Write comprehensive tests** - Card data validation and accessor testing

## Testing & Acceptance Criteria
- **Complete catalog**: Exactly 100 offensive cards (20×5) + 10 defensive cards
- **Card balance**: Appropriate risk/reward profiles for each playbook archetype
- **Type safety**: All card operations strictly typed, no `any` usage
- **Metadata quality**: Meaningful names, descriptions, and risk indicators
- **Loader performance**: Card catalog loads in < 50ms
- **Defensive coverage**: 10 defensive cards provide universal coverage
- **UI compatibility**: Card data works with selection and rendering systems
- **CI passes**: `npm run ci` succeeds with new card catalog

## Edge Cases
- **Special characters**: Card names with unicode or special characters handled properly
- **Long descriptions**: Text wrapping and overflow in card displays
- **Duplicate prevention**: No duplicate card names across playbooks
- **Balance validation**: Cards provide meaningful tactical choices

## Docs & GDD Update
- Add "Card Catalog" section to GDD detailing the 100-card system
- Document card metadata format and authoring guidelines
- Include examples of card definitions for future contributors

## Version Control
- **Branch name**: `feature/migration-card-catalog`
- **Commit format**:
  - `feat(data): create complete 100-card offensive playbook catalog`
  - `feat(data): define 10-card universal defensive deck`
  - `feat(data): implement type-safe card catalog accessors`
  - `feat(data): add comprehensive card metadata system`
  - `test(data): card catalog loading and validation tests`
  - `docs(cards): card definition format and authoring guide`
- **PR description**: "Create complete card catalog for dice engine system. Features 100 offensive cards across five playbooks, 10-card defensive deck, comprehensive metadata, and type-safe accessors for UI and AI integration."
- **Risks**: None - card catalog provides data for new systems
- **Rollback**: Remove card catalog, existing systems use fallback data

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/types/dice.ts` (card type definitions to implement)
- `gdd.md` (playbook and card specifications)
- Current deterministic card names (for inspiration and compatibility)
