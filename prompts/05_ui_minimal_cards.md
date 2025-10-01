# 05_ui_minimal_cards.md — Temporary Button UI for Cards

## Title & Goal
Replace image-based card system with programmatic button UI (card name + 1-line description) to enable playtesting of the new 2d20 dice engine while maintaining clean separation from visual card rendering.

## Context
**What exists:**
- Image-based card system in `src/ui/Hand.ts` and `src/ui/field/`
- Current card assets in `assets/cards/`
- Event-driven UI system in `src/utils/EventBus.ts`
- Progressive enhancement in `src/ui/progressive/`

**What must change:**
- Create button-based card selection UI for five new playbooks
- Implement 10-card universal defensive deck selection
- Add penalty modal flow for accept/decline choices
- Build result reveal pane and outcome display
- Maintain accessibility and keyboard navigation
- Keep UI modular for easy replacement with visual cards later

## Inputs
- `src/ui/Hand.ts` (existing card UI patterns)
- `src/utils/EventBus.ts` (event system for UI communication)
- `src/types/dice.ts` (card type definitions)
- `assets/cards/` (existing card structure for reference)

## Outputs
- `src/ui/dice/` (new directory for dice engine UI)
- `src/ui/dice/CardSelector.ts` (playbook and defensive card selection)
- `src/ui/dice/PenaltyModal.ts` (accept/decline penalty choices)
- `src/ui/dice/ResultDisplay.ts` (dice results and outcome pane)
- `src/ui/dice/DiceUI.ts` (main dice UI coordinator)
- `tests/ui/dice/` (comprehensive UI tests)
- `src/ui/index.ts` (export new UI components)

## Constraints & Guardrails
- Follow `/docs/agent_best_practices.md` - single purpose, strict types, pure functions
- Do **not** delete or mass-move files outside stated scope
- Keep PRs small, single-topic, and reversible
- Enforce TS strictness; no `any`; small, single-purpose modules
- Maintain accessibility standards (keyboard nav, screen readers, focus management)

## Step-by-Step Plan
1. **Create card type definitions** - Button-based card interfaces
2. **Implement card selector** - Playbook dropdown and defensive card buttons
3. **Add penalty modal** - Accept/decline for 2-19 doubles; informational for 4/5/6 overrides
4. **Build result display** - Dice results, yards, clock, and outcome information
5. **Integrate event system** - Connect UI to game flow via EventBus
6. **Add comprehensive tests** - UI behavior and accessibility testing

## Testing & Acceptance Criteria
- **Card selection**: Five playbooks available with 20 cards each
- **Defensive deck**: 10-card universal defensive selection
- **Penalty flow**: Modal for 2-19 doubles (accept/decline); informational modal for 4/5/6 overrides
- **Result display**: Shows dice rolls, yards, clock runoff (10"/20"/30"), tags, and field position edge cases
- **Keyboard navigation**: Full keyboard operability for all interactions
- **Accessibility**: Screen reader compatible with proper ARIA labels and focus trapping
- **Event integration**: Proper EventBus communication with game flow
- **Progressive enhancement**: Works without JavaScript, enhanced with it
- **Performance**: UI updates complete in < 16ms for 60fps responsiveness
- **CI passes**: `npm run ci` succeeds with new UI components

## Edge Cases
- **Network issues**: Graceful fallback when card data fails to load
- **Screen readers**: All interactive elements properly labeled and announced
- **Mobile devices**: Touch-friendly button sizes and spacing
- **Slow connections**: Progressive loading of card information
- **Error states**: Clear messaging when UI components fail to initialize

## Docs & GDD Update
- Add "Dice UI (V1)" section to GDD explaining the button-based approach
- Document the transition plan to visual cards (V2)
- Include accessibility compliance checklist

## Version Control
- **Branch name**: `feature/migration-ui-cards-v1`
- **Commit format**:
  - `feat(ui): create button-based card selection for five playbooks`
  - `feat(ui): implement 10-card universal defensive deck selector`
  - `feat(ui): add penalty accept/decline modal interface`
  - `feat(ui): build dice result display with yards/clock/tags`
  - `feat(ui): integrate EventBus for seamless game flow`
  - `test(ui): comprehensive accessibility and behavior testing`
- **PR description**: "Implement temporary button-based UI for 2d20 dice engine playtesting. Features five playbook selectors, defensive deck, penalty modal, and result display with full accessibility support. Designed for easy replacement with visual cards in V2."
- **Risks**: Low - new UI runs parallel to existing image-based system
- **Rollback**: Remove new UI directory, existing image system unaffected

## References
- `/docs/agent_best_practices.md` (required reading)
- `src/ui/Hand.ts` (existing UI patterns to follow)
- `src/utils/EventBus.ts` (event system for UI integration)
- `src/ui/progressive/` (progressive enhancement patterns)
