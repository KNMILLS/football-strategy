# Gridiron Strategy – Design Document (Godot 4.4, GDScript)

## Vision
A modern, streamlined “NFL Strategy”-style tabletop-to-digital experience. Quick, drive-based sessions, deterministic RNG for reproducibility, and simple but readable UI. Players can play Human vs AI or Hot Seat on one device.

## Core Pillars
- Drive-based football with four downs to gain ten yards, starting at own 25.
- Hidden simultaneous selection: Offense picks from six plays; Defense selects from four fronts.
- Outcome matrix with weighted distributions and special teams tables.
- Deterministic RNG with optional seed for reproducibility and testing.
- Single screen, accessible layout; emoji-tagged action log; quick result banner; help overlay.

## Game Rules
- Start at own 25. Offense direction: +1 for home, -1 for away (possession flips per drive).
- Offense plays: RUN_IN, RUN_OUT, PASS_SHORT, PASS_LONG, PUNT, FG.
- Defense fronts: RUN_BLITZ, BALANCED, PASS_SHELL, ALL_OUT_RUSH.
- Reveal and resolve via weighted outcome matrix (see `scripts/Rules.gd` DATA constant).
- Interpretations:
  - Numeric strings are yards relative to LOS. Negative moves backward.
  - INCOMP = incomplete (down counts).
  - SACK_-N = subtract N yards (down counts).
  - INT = interception at spot, zero return yards.
  - FUMBLE = 50% offense recovery; if defense recovers, turnover at spot.
  - PENALTY_DEF_+5 = grant 5 yards, down replayed.
  - PENALTY_OFF_-10 = minus 10 yards, down replayed.
  - Punts use NET_X; BLOCK returns ball at LOS to defense.
  - Field goal distance = 17 + yards-to-goal; buckets: 0_39, 40_49, 50_57 (or miss if out of range).
- Scoring: TD = 7, FG = 3. No clock, extra points, or returns beyond defined.

## Modes
- Human vs AI: Offense selects, AI silently selects defense via rules-based logic.
- Hot Seat: Offense selects; a modal prompts Player 2 to choose defense (Q/W/E/R hotkeys).

## AI (Defense)
Priority rules in `scripts/DefenseAI.gd`:
1. 1st & 10 → BALANCED.
2. To go ≤ 2 → RUN_BLITZ.
3. 2nd/3rd and to go ≥ 8 → PASS_SHELL.
4. 4th and to go ≥ 5 → PASS_SHELL.
5. If last two offense calls were passes → 25% chance ALL_OUT_RUSH.
6. Else random among four fronts.

## Determinism and RNG
- `SeedManager.gd` provides RNG and helpers (`randf`, `randi`, `randi_range`, `weighted_choice`, `chance`).
- Seed chosen from title UI; can reset with system time.
- All randomness flows through SeedManager; tests can set seed to reproduce sequences.

## Data and Resolution
- `scripts/Rules.gd` contains:
  - DATA dictionary with plays, matrix, and special teams.
  - Yardline formatting: "OWN 1..49", "50", "OPP 49..1" based on offense direction.
  - `weighted_choice(options)` returns value via integer weights.
  - `resolve_play(off_play, def_play, ball_on, offense_dir)` returns outcome dictionary with fields: `yards_delta`, `event_name`, `penalty_replay`, `turnover`, `touchdown`, `field_goal`, `descriptive_text`.
  - `apply_outcome(state, outcome)` mutates `ball_on`, `down`, `to_go`, scores, drive end flags.
  - `field_goal_bucket(ball_on, dir)` returns bucket or empty when out of range.
  - `do_punt(ball_on, dir)` returns `new_spot`, `blocked`, `event_name`.
  - `fumble_offense_recovers()` is ~50% via RNG.

### State and Possession
- Ball position expressed as absolute 0..100; offense direction ±1 applies yardage.
- First downs reset down to 1 and `to_go` to 10.
- Penalty replay modifies yardage but does not advance down; can award first down if enough yardage gained.
- Turnovers end the drive immediately (INT, fumble lost, punt, FG attempt resolved).

## Game Flow / State Machine
Implemented via `scripts/GameState.gd` autoload.
- States: IDLE (menu inline in header), PRESNAP, DEFENSE_SELECT (Hot Seat only), RESOLVE, DRIVE_END.
- Start session sets seed, drives, mode; starts Drive 1 at own 25.
- Offense selects play; either AI chooses defense or modal appears for Hot Seat.
- Resolve outcome, update state and UI; display banner and append to log with emojis.
- Drive ends on score, turnover, punt, or FG result. Possession flips and next drive starts until drive limit.

## UI / UX
- `res://Main.tscn` loads `res://ui/MainUI.tscn` with `Main.gd` controller.
- Layout (Control nodes only):
  - Header: Title, Score, Drive, Seed input, Drives spin, Mode option, Start, Reset Seed, Help.
  - Field panel: Ball spot (OWN/OPP/50), Down & To go.
  - Offense panel: 6 buttons with 1..6 shortcuts.
  - Outcome banner: fades in/out with tween.
  - Action log: RichTextLabel shows last 20 events with emojis (💥 Sack, 🛑 INT, ⚠️ Fumble, 🚩 Flag, 🏈 FG/Punt, 📈 Gains).
  - Defense modal (Hot Seat): Q/W/E/R shortcuts.
  - Help overlay (H): brief rules and controls.

## File Structure
- `res://Main.tscn`, `res://Main.gd`
- `res://scripts/GameState.gd` (autoload)
- `res://scripts/Rules.gd`
- `res://scripts/DefenseAI.gd`
- `res://scripts/SeedManager.gd`
- `res://ui/MainUI.tscn`
- `res://tests/test_runner.gd`, `res://tests/test_rules.gd`
- `res://docs/test_commands.md`, `res://docs/Design.md`
- `res://README.md`

## Testing
- Lightweight test runner `tests/test_runner.gd` enumerates and runs tests from `tests/test_rules.gd`.
- Coverage:
  - Weighted-choice determinism and distribution.
  - Field goal bucket classification.
  - Outcome distribution sanity for key matchups.
  - Penalty replay correctness.
  - Fumble recovery ~50%.
  - Punt net yard behavior and block rate handling.
  - Scripted drive with deterministic seed.
- Can be invoked from Godot MCP.

## MCP & Editor Integration
- `addons/gdai-mcp-plugin-godot` enables programmatic play, testing, screenshots, and error capture.
- Main scene set in `project.godot`; autoloads: SeedManager, Rules, GameState.

## Accessibility & Controls
- Offense: 1..6 map to the six plays.
- Defense (Hot Seat): Q/W/E/R map to the four fronts.
- Help overlay toggle: H.
- Start session, Reset Seed buttons for quick runs.

## Determinism Notes
- Always set seed at session start; tests reset seed before test blocks.
- Avoid using random methods outside SeedManager.

## Future / Stretch
- Era toggle: apply multipliers to outcomes on load (Run centric vs Modern pass heavy).
- Tendency tracker: last five offense calls as compact icons/bars.
- Simple UI sounds via AudioStreamGenerator.
- HTML5 export with single page instructions.

## Round 2 Additions
- First down model: line_to_gain based on series_start; penalties replay down and can produce first downs by yardage.
- Field goal guardrails: kick_distance = 17 + yards-to-goal (min 18). Out of range (>57) disallowed.
- Punt touchbacks: net crossing receiving goal sets ball at 20. Spots always within 0..100.
- State invariants: assert_state checks for spot, down, and to_go sanity.
- Hot Seat reveal: 1 second banner reveal before logging.
- Quick Play (Enter) and Determinism HUD (F1) show Seed and RNG call count.
- Optional Offense AI for soak tests.

## Non-Goals (MVP)
- No game clock, no extra points, no return yards on turnovers.
- No deep playbook or personnel. No network multiplayer.

## Risks & Mitigations
- Ambiguity around negative plays and `to_go` updates: current logic treats negative yardage as not increasing `to_go` beyond the original remaining (simplified). Tests verify sanity but can be refined.
- Autoload name collisions: removed `class_name` to avoid hiding singleton names in 4.4.
- UI consistency: Kept to default Control styles; avoids external assets.

## Acceptance Checklist
- Start project, play four drives, varied outcomes, scores update, no crashes.
- Hot Seat modal hides offense choice and enables defense selection.
- Tests pass via MCP.
- Different seed → deterministic but different sequences for same interactions.
