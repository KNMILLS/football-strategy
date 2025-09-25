Gridiron Strategy — Combo Animation Validation (v2 simul)

This document describes manual and console-based checks to validate the minimal animator for `combo_ProStyle_PowerUpMiddle_InsideBlitz_scripts.expanded.json`.

Prereqs
- Ensure `scripts/gs_animator.js` is loaded (it is auto-imported by index.html/main.js) and the combo JSON is fetched.
- Open dev console.
- Enable DEV MODE checkbox to visualize diagnostic overlays (LOS/1st-down bars are already present, DEV adds start dots and ghost paths).

Static placement tests
1) Run two placements:
   - Right: `__GS_RUN_COMBO('F', 0);`
   - Left:  `window.GSAnimator.animate({ chartKey: 'F', dir: 'L', ballOnYard: game.ballOn, speed: 0 });`
2) Verify all 22 start in-bounds:
   - min distance from sidelines ≥ 2 yards
   - min distance from goal lines ≥ 0.5 yard
3) Use console sampling to dump each actor’s yard and pixel coords:
   - positions are visible in overlay; compute with `window.GSAnimator` transforms if needed.

Order-of-operations tests
- Ensure timeline `snap` happens before `handoff` (0.15s vs 0.28s default).
- Subscribe to events:
```
const events = [];
const off = [
  window.GSAnimator.on('snap', e => events.push(['snap', e.t])),
  window.GSAnimator.on('handoff', e => events.push(['handoff', e.t])),
  window.GSAnimator.on('tackle', e => events.push(['tackle', e.yards])),
  window.GSAnimator.on('whistle', e => events.push(['whistle'])),
  window.GSAnimator.on('result', e => events.push(['result', e]))
];
window.GSAnimator.animate({ chartKey: 'F', ballOnYard: game.ballOn, speed: 1 });
setTimeout(() => { console.table(events); off.forEach(u=>u()); }, 2000);
```

Motion correctness
- Use script keys: A, F, H, J and verify ball/runner motion follows a straight/curved path consistent with HB controller path; final position aligns with `result_table[key]` yards relative to LOS (±0.1 yd visual tolerance).

Bounds compliance
- Observe runner and ball remain within the in-bounds rectangle. Clamping events are tracked; open the console to see warnings if clamp count rises. Visual inspection should show no crossing of sidelines or goal lines.

Determinism
- With fixed inputs, run twice and compare `result` and rough positions (visually or by sampling at fixed times). Expected identical `result` object values.

Mirroring
- Run with `dir:'R'` and `dir:'L'`. The Y series should match; X should mirror around the LOS. Visual check: paths reflect horizontally.

Artifacts
- DEV MODE overlay shows start dots and ghost paths for HB/FB when available.
- Use `__GS_RUN_COMBO('F', 0.6)` to preview with animation; set speed 0 for static.

Notes
- This minimal animator consumes the v2 simul JSON. It animates snap/handoff and HB movement based on the provided controller path, resolving `RESULT_YARDS` from `result_table`.

### Animation Validation — Combo Animator

This document records validation runs for the combo animation executor.

Instructions
- In the browser console, run the dev helper functions.
- Ensure DEV MODE is enabled to render start dots and overlay lines.

Setup
1. Load the app; it auto-initializes the animator and preloads the sample combo.
2. Optional: toggle the DEV checkbox to visualize LOS/1st-down and start dots.

Helpers
- Run a script: `__GS_RUN_COMBO('A')` (keys A..J)
- Log start positions: `window.GSAnimator.logStartTable()`

Checks
1) Static placement tests
- Confirm 22 starters appear in-bounds in both dir R/L (toggle possession and rerun):
  - min distance from sidelines ≥ 2 yards
  - min distance from goal lines ≥ 0.5 yard
- Use console.table dumps (see below) to inspect transforms.

2) Order-of-operations tests
- Verify strict `t` monotonicity until WHISTLE.
- Ball holder sequence: C → QB (snap) → HB (handoff) for the provided scripts.

3) Motion correctness
- Test keys: A (negative), F (short gain), H (medium), J (first-down).
- Validate tackle location approx equals scripted `.tackle.at.x/y` (±0.1 yd).

4) Bounds compliance
- No actor crosses sidelines or goal lines; console shows clamping count if any.

5) Determinism
- Re-run with the same possession and ball spot; results identical.

6) Mirroring
- Switch possession AI vs player and run same chart; Y matches, X mirrored.

Artifacts
- Capture screenshots/GIFs and console tables of start positions and final `result`.



