Gridiron Strategy (Godot 4.4)

Run
- Open in Godot 4.4+ and play. Main scene is `Main.tscn`.
- Choose mode (Human vs AI or Hot Seat), set seed and drives, Start.

Tests
- Use the built-in MCP plugin. Commands are in `docs/test_commands.md`.
- Or run the scene `res://tests/test_runner.gd` directly to execute tests.

Notes
- Deterministic RNG via `SeedManager.gd`. Change seed for repeatable sessions.
- Rules and outcome matrices in `scripts/Rules.gd`.
- Defense AI in `scripts/DefenseAI.gd`.
 - Detailed design in `docs/Design.md`.


