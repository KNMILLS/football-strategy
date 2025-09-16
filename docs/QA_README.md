### QA Harness v1

Run all tests headless:

```bash
mcp run tests
```

Focused suites:

```bash
mcp run tests focus invariants
mcp run tests focus distributions
```

Scripted scenario:

```bash
mcp run scenario seq_basic --seed 424242
```

Save artifacts:

```bash
mcp run tests --save-artifacts
```

Artifacts are saved under `user://qa_artifacts/`.


#### v1.0 Test Matrix
- Mode lock: `tests/test_mode_lock.gd`
- Team identity deltas: `tests/test_team_identity.gd`
- Scheme call mix tolerances: `tests/test_scheme_callmix.gd`
- AI learning (N=12) and difficulty separation: `tests/test_ai_learning.gd`
- Special teams guardrails (FG LOS+17, touchback=20): `tests/test_special_teams.gd`
- Retro UI structure (tile counts, grids): `tests/test_retro_ui_layout.gd`
- Determinism (outcomes + RNG call counts, HUD screenshot): `tests/test_determinism.gd`
- Invariants/fuzz long: `tests/test_invariants.gd`

All tests use fixed seeds and can emit JSON artifacts/screenshots under `user://qa_artifacts/`.


