Gridiron Strategy — Minimal Combo Animator

Overview
- Adds `scripts/gs_animator.js`, an SVG-based overlay animator for combo plays.
- Consumes the expanded v2 simul JSON: `combo_ProStyle_PowerUpMiddle_InsideBlitz_scripts.expanded.json`.
- Provides `initField`, `loadCombo`, `animate`, `stop`, `replayLast`, and `on`.

DOM/Selectors
- Field container: `#field-display` (overlay is appended here as `<svg class="play-art">`).
- Log container: `#log`.
- Bottom hand: `#hand`.
- DEV toggle: `#dev-mode-checkbox` (enables diagnostic dots/paths).

Coordinate Transform (yards → pixels)
Let `ballOnYard` be LOS absolute yard from left goal (0..100). Horizontal playable width is 90% between the end zones.

Derived from DOM:
- `pxPerYardX = innerWidthPx / 100`
- `pxPerYardY = innerHeightPx / 53.333`
- `losXPx = leftGoalLinePx + ballOnYard * pxPerYardX`
- `midlineYPx = topPx + innerHeightPx / 2`

Transform:
```
screenX = losXPx + x_yd * (dir === 'R' ? +pxPerYardX : -pxPerYardX)
screenY = midlineYPx + y_yd * pxPerYardY
```

Clamping
- Sidelines: clamp to ≥ 2 yards from each sideline (yard space), i.e., `|y| ≤ 53.333/2 − 2`.
- Goal lines: clamp to ≥ 0.5 yards from each goal line for absolute X.

Direction
- Offense to the right is `dir:'R'`; left is `dir:'L'`. Mirroring is performed by flipping only the X component in the transform.

Usage
1) Module is preloaded in `index.html`, and dynamically imported in `main.js`.
2) On page load, `main.js` attempts to fetch the combo JSON and calls `GSAnimator.loadCombo(json)`.
3) Run from console or the test sidebar:
   - Console: `__GS_RUN_COMBO('F', 0.6)`
   - Sidebar: choose script key (A..J) and click "Run Combo".

Events
- `on('snap'| 'handoff' | 'tackle' | 'whistle' | 'result', handler)`.
- `result` is `{ yards, newBallOn, turnover: false, possessionSwap: false }`.

DEV Mode
- Check the DEV checkbox to overlay start dots and ghost paths for HB/FB when available.

Extending
- Additional combos: ensure the expanded JSON provides `actors`, `controllers` paths for HB/FB, and `ball.events` for snap/handoff. `result_table` should provide yards per chart key.

### Gridiron Strategy — Combo Animator

Overview
- This module (`scripts/gs_animator.js`) renders a scripted 22-player animation plus ball from a combo JSON of schema `gs_combo_animation_v1`.
- It injects a single SVG overlay (`<svg class="play-art">`) inside `#field-display` and animates actors by timelines (scripts A..J).

Public API
- `initField(rootEl)`: attach SVG overlay and compute metrics.
- `loadCombo(json)`: validate and store the combo object.
- `animate({ chartKey, dir, ballOnYard, speed, seed })`: run one script; returns `{ yards, newBallOn, turnover, possessionSwap }`.
- `stop()`, `replayLast(seconds, speed)`.
- `on(event, handler)`: subscribes to `snap, handoff, throw, catch, drop, intercept, tackle, whistle, result`.

Coordinate Transform (yards → pixels)
- Inner grass bounds are 5% from left/right for end zones.
- Let `rect = #field-display.getBoundingClientRect()`.
- `leftGoalLinePx = rect.left + rect.width * 0.05`
- `rightGoalLinePx = rect.left + rect.width * 0.95`
- `midlineYPx = rect.top + rect.height * 0.5`
- `pxPerYardX = (rightGoalLinePx - leftGoalLinePx) / 100`
- `pxPerYardY = rect.height / 53.333`
- `losXPx = leftGoalLinePx + ballOnYard * pxPerYardX`
- For each entity yard coordinate `{x_yd, y_yd}` (relative to LOS and midline):

```
screenX = losXPx + x_yd * (dir === "R" ? +pxPerYardX : -pxPerYardX)
screenY = midlineYPx + y_yd * pxPerYardY
```

Clamping
- Sidelines: ≥ 2 yards; goal lines: ≥ 0.5 yard.
- We clamp each frame to these bounds and count occurrences; a console warning prints once if any clamping occurred.

Direction
- Default is driven by possession: player → right, AI → left. You may override via `animate({ dir: 'R'|'L' })`.
- Mirroring flips X only; Y is unchanged.

Turnovers
- Supports scripted `fumble` and `interception` templates. The ball is transferred to the specified/nearest defender and a direction-aware return is animated within provided bounds (no RNG).

DEV Helpers
- Console: `__GS_RUN_COMBO('F')` to run a script; `GSAnimator.logStartTable()` to dump start positions in yards and pixels.

End targets and 60 FPS granular timelines
- The generator exposes `GSAnimator.makeGranularCombo(combo, 1/60)` which expands timelines to dense 60 FPS and computes deterministic `end_targets` per script.
- `end_targets` is stored per script as `{ [actorId]: { x, y } }` and used to ensure all 22 actors snap exactly to intended final yards at WHISTLE.
- Roles mapping (summary):
  - HB: exactly at `tackle.at`.
  - Tacklers: small ring around `tackle.at`.
  - OL/TE/FB: wedge toward pile with slight lateral bias from start Y.
  - DL/LB: drift/flow toward pile with capped lateral.
  - WR/DB: capped drifts (CB smallest, S moderate).
  - QB: short carryout/settle behind play.
- During expansion every tick includes `micro_move` for all 22; original actions remain at exact times. At WHISTLE, a final snap ensures exact `end_targets`.

Determinism validator (granular only)
- On WHISTLE, if the active script has `end_targets` and the timeline is granular, the animator prints a `console.table` of final actor yards and compares to targets (tolerance ±0.11 yd). A warning logs if any deviate.

Adding More Combos
- Provide a combo JSON with the required schema, 22 entities with unique ids and yard starts, and scripts A..J with strictly increasing `t` values, ending with `WHISTLE` and `spot_ball`.


