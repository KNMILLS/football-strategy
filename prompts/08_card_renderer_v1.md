# 08_card_renderer_v1.md — Programmatic Card Renderer

## Title & Goal
Replace static card images with a lightweight SVG/Canvas card renderer displaying card names, descriptions, and visual indicators for risk level and perimeter bias, providing a programmatic foundation for the visual card system.

## Context
**What exists:**
- Static card images in `assets/cards/`
- Image-based card rendering in `src/ui/field/overlayCards.ts`
- Current card asset structure for reference
- Progressive enhancement system in `src/ui/progressive/`

**What must change:**
- Create SVG-based card renderer for playbook cards
- Display card name, description, and visual risk/perimeter indicators
- Support both offensive playbook cards and defensive cards
- Enable dynamic card generation without external assets
- Maintain performance with lightweight rendering approach
- Design for easy extension to full visual card system (V2)

## Inputs
- `assets/cards/` (existing card structure for design reference)
- `src/types/dice.ts` (card type definitions)
- `src/ui/field/overlayCards.ts` (existing overlay patterns)
- `src/ui/progressive/` (progressive enhancement approach)

## Outputs
- `src/ui/cards/` (new directory for programmatic card system)
- `src/ui/cards/CardRenderer.ts` (SVG/Canvas card rendering engine)
- `src/ui/cards/CardTemplates.ts` (card layout and styling definitions)
- `src/ui/cards/RiskIndicator.ts` (visual risk level display)
- `src/ui/cards/PerimeterBadge.ts` (OOB bias visual indicator)
- `tests/ui/cards/` (card rendering tests)
- `src/ui/index.ts` (export new card components)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Maintain performance with lightweight SVG approach (< 5ms per card)

## Step-by-Step Plan
1. **Design card templates** - SVG layouts for different card types
2. **Implement card renderer** - Core rendering engine with caching
3. **Add visual indicators** - Risk level and perimeter bias displays
4. **Create card definitions** - Data structure for all playbook cards
5. **Integrate progressive enhancement** - Fallback for rendering failures
6. **Add comprehensive tests** - Visual regression and functionality tests

## Testing & Acceptance Criteria
- **Card rendering**: All 100 playbook cards render correctly (20×5 playbooks)
- **Visual indicators**: Risk levels and perimeter bias clearly displayed
- **Performance**: Card rendering completes in < 5ms per card
- **Accessibility**: Cards accessible via screen readers and keyboard
- **Progressive enhancement**: Graceful fallback when rendering fails
- **Caching**: Repeated card renders use cached SVG elements
- **Responsive design**: Cards scale appropriately across screen sizes
- **CI passes**: `npm run ci` succeeds with new card renderer

## Edge Cases
- **Rendering failures**: Clear fallback when SVG/Canvas unavailable
- **Special characters**: Card names with unicode characters render properly
- **Long descriptions**: Text wrapping and overflow handling
- **Color schemes**: Cards work across all theme variants
- **Memory usage**: Cached cards don't leak memory over time

## Docs & GDD Update
- Add "Programmatic Card Renderer (V1)" section to GDD
- Document the transition plan from V1 buttons to V2 visual cards
- Include performance characteristics and rendering approach

## Version Control
- **Branch name**: `feature/migration-card-renderer-v1`
- **Commit format**:
  - `feat(ui): implement SVG-based card renderer engine`
  - `feat(ui): add visual risk and perimeter indicators`
  - `feat(ui): create card template system with caching`
  - `feat(ui): integrate progressive enhancement for reliability`
  - `feat(ui): add comprehensive visual regression tests`
- **PR description**: "Implement lightweight SVG card renderer for playbook cards. Features visual risk indicators, perimeter bias badges, and comprehensive caching. Designed as foundation for future visual card system (V2)."
- **Risks**: Low - new renderer runs parallel to existing image system
- **Rollback**: Remove new card directory, existing image system unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `assets/cards/` (existing card structure for design reference)
- `src/ui/progressive/` (progressive enhancement patterns to follow)
- `src/types/dice.ts` (card definitions to implement)
