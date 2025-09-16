Gridiron Strategy (Godot 4.4)

Run
- Open in Godot 4.4+ and play. Main scene is `Main.tscn`.
- Choose mode (Human vs AI or Hot Seat), set seed and drives, Start.

Tests
- Use the built-in MCP plugin. Commands are in `docs/test_commands.md`.
- Or run the scene `res://tests/test_runner.gd` directly to execute tests.
 - Round 2 tests: `tests/test_rules_round2.gd` and `tests/test_fuzz_round2.gd` included.

Notes
- Deterministic RNG via `SeedManager.gd`. Change seed for repeatable sessions.
- Rules and outcome matrices in `scripts/Rules.gd`.
- Defense AI in `scripts/DefenseAI.gd`.
 - Detailed design in `docs/Design.md`.
 - Quick Play: press Enter on the title to start vs AI with 4 drives. HUD (F1) toggles Seed/RNG#.


