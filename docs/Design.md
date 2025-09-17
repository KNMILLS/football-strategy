### Gridiron Strategy — v1.1e (Phase-4)

This document consolidates and supersedes prior GDDs. It is the authoritative game design document moving forward.

#### Vision & Pillars
- Fast, readable strategy: hidden, simultaneous selection with compact outcomes.
- Retro presentation: Splash → Setup → Playcalling reminiscent of Madden ’95.
- Deterministic & testable: all randomness flows through a single `SeedManager` with reproducible sims and RNG call-count HUD (F1 toggles).
- Team identity: archetypes subtly bias call mix and outcomes (no roster stats).

#### Core
- Single self-contained Standard mode game.
- Data-driven outcome matrix lives in `scripts/Rules.gd` (immutable base). Per-session adjustments applied via `scripts/SessionRules.gd` from Team JSONs and Difficulty.

#### Playbooks
- Offense (12): `INSIDE_POWER`, `OUTSIDE_ZONE`, `DRAW`, `QB_SNEAK`, `QUICK_SLANT`, `SCREEN`, `MEDIUM_CROSS`, `DEEP_POST`, `PA_SHORT`, `PA_DEEP`, `PUNT`, `FIELD_GOAL`.
- Defense (6 fronts): `RUN_BLITZ`, `BALANCED`, `PASS_SHELL`, `PRESS_MAN`, `ZONE_BLITZ`, `PREVENT`.

#### Presentation & Controls (Retro)
- Flow: Splash (1–1.5s) → Setup overlay → Playcalling UI (runs 4, pass 6, specials 2; defense modal 6 fronts).
- HUD: Down/Distance, Ball On, Score/Drives, Clock (MM:SS), Quarter, Seed and RNG count.
- Controls: Offense 1–6; Defense Q/W/E/R/T/Y (Hot Seat modal).

#### Teams & Schemes
- Data-driven JSON in `res://teams/*.json` (initial 12 teams).
- Each defines display name, offense/defense scheme labels, small call-bias tweaks, and small result tuning multipliers (±1–5%).
- `TeamLoader.gd` loads/validates; `SessionRules.gd` composes read-only biases, token weight adjustments, and matchup-aware big-play multipliers (capped) per scheme/difficulty.

#### Core Resolution Model (12×6)
- For each (OFF_PLAY, DEF_FRONT), a compact set of weighted buckets:
  - `event`: `YARDS` (with `yards_range`), `INCOMP`, `SACK`, `INT`, `FUMBLE` (with `offense_recovers`), `PENALTY_OFF/DEF` (with `kind`, `replay_down`, `auto_first_down`), or specials (`FG_GOOD/MISS`, punt nets/block).
  - Optional `context_rules` to allow/deny tags (e.g., `QB_SNEAK` short-yardage only).
- Resolver steps:
  1. Filter buckets by `context_rules`.
  2. Apply `SessionRules` multipliers to bucket weights (pre-draw).
  3. Weighted draw → materialize event (yards/flag/turnover/etc.).
  4. Apply result tuning (post-draw micro-deltas), clamp to invariants.
  5. Evaluate Big Play layer (below), possibly overriding with a rare explosive result.

#### Specials
- Field Goal: LOS + 17 distance; buckets for 0–39, 40–49, 50–57; out-of-range attempts are disallowed.
- Punt: weighted net yards + block chance; scrimmage-kick touchback → ball at the 20.

#### Big Play System (Offense & Defense)
- Goal: Rare, deterministic, matchup-sensitive explosive outcomes.
- Triggers & caps: Base per-play chances (offense) and per-front chances (defense) with matchup multipliers and scheme/difficulty nudges within hard caps (offense ≤ 2.5%, defense ≤ 2.0%).
- Eligibility & precedence: Offense BP requires positive gain or completed pass; Defense BP requires turnover/blocked-kick family events. On conflict, prioritize the side consistent with the base event (turnover/block → defense first; else offense first).
- Result types:
  - Offense: `RUN_BREAKAWAY`, `YAC_EXPLOSION`, `DEEP_BOMB_TD`.
  - Defense: `PICK_SIX`, `STRIP_SACK_TD`, `SCOOP_AND_SCORE`, `BLOCK_PUNT_TD`, `BLOCK_FG_TD`.
- All random draws (trigger, type, extra yards) come from `SeedManager`.

#### Timing, Two-Minute & Overtime
- Game Length Presets (persisted until changed): Quick 5:00 (300s), Standard 10:00 (600s), Full 15:00 (900s). Configured in `data/timing.json` under `quarter_presets` with `default_preset`.
- Per-play base times (examples): RUN_INBOUNDS 33s; PASS_COMPLETE_SHORT_MED 30s; PASS_COMPLETE_DEEP 33s; QB_SNEAK 22s; SACK/INCOMPLETE/OUT_OF_BOUNDS/PENALTY_ACCEPTED/TURNOVER 15s; PUNT_RESOLVED 15s; PUNT_TOUCHBACK 0s; FIELD_GOAL_ATTEMPT 15s; TOUCHDOWN 0s.
- Two-minute mode: when clock ≤ 2:00 in Q2, Q4 (and OT warning at 2:00), switch to tick timing: 7s per tick with mapping (RUN_INBOUNDS 5, PASS_SHORT_MED 4, PASS_DEEP 5, QB_SNEAK 3, SACK 3, INCOMP/OUT 1, PUNT_RESOLVED 2, FG_ATTEMPT 2, TD 0).
- Deterministic: timing has no RNG; applied after outcome resolution without altering draw order. UI shows MM:SS and quarter; one-time TWO-MINUTE WARNING banner appears at entry.

##### Overtime (2025 NFL fair-possession; one period)
- Trigger: at end of Q4 if tied. Coin Toss: visiting team calls; winner chooses Receive or Defend. Series start at OWN 25 (kickoffs coming in Phase 4.3).
- OT length: equals selected Game Length preset. Timeouts: 2 per team, separate from regulation; two-minute warning at 2:00 in OT uses tick mapping above.
- Fair Possession: both teams guaranteed one possession unless the first series ends in a defensive TD or safety (game ends immediately).
- After both possessions, if still tied: Sudden Death (next score wins) within remaining OT clock. Ties allowed if OT expires still tied.

#### AI
- Difficulty (Rookie/Pro/Legend): exploration ε ≈ 0.30/0.15/0.05; bluff ≈ 0.20/0.10/0.05; Legend adds +25% weight to top counter.
- DefenseAI: rolling window N≈12 of recent offense calls (Laplace-smoothed), chooses front minimizing expected yards; blends scheme bias and difficulty; PREVENT only situationally.
- OffenseAI: scheme-biased priors with situational overrides (short-yardage favors runs; 2nd/3rd & long favors passes); small exploration.

#### Determinism & Guardrails
- SchemaGuard enforces `schema_version` on rules (`1.1`), timing (`1.0`), and team JSONs (`1.0`). Mismatch is a hard fail.
- OutcomeBuilder normalizes resolver outputs for timing/logging determinism. All outcomes include: `event_name`, `yards_delta`, `turnover`, `touchdown`, `penalty_replay`, `timing_tag`, `ended_inbounds`, `big_play`.
- EventLogger standardizes banners/logs with consistent emojis/verbs.
- Determinism contract: same seed + same play inputs ⇒ identical outcomes and RNG call counts.

#### Testing & QA (via godot-mcp)
- Core suites include: matrix integrity (12×6); big-play trigger rates/types sanity; scheme effects; AI defense selection; determinism (outcomes+call counts); retro UI layout groups/hotkeys.
- Save JSON summaries and screenshots (Setup, Playcalling) to `user://qa_artifacts/`.

#### Files & Structure (key)
- `res://Main.tscn`, `res://Main.gd`
- `res://scripts/GameState.gd` (autoload)
- `res://scripts/Rules12x6.gd` (loads `res://data/rules_12x6.json`, resolver + Big Play)
- `res://scripts/SessionRules.gd` (composition & clamps)
- `res://scripts/DefenseAI.gd`, `res://scripts/OffenseAI.gd`
- `res://data/rules_12x6.json`, `res://teams/*.json`
- `res://ui/MainUI.tscn`
- `res://tests/*.gd`

#### Acceptance Checklist (Phase 4)
- 12 offense plays × 6 defense fronts; grouped UI with correct hotkeys.
- Resolver uses context rules, `SessionRules` pre-draw multipliers, post-draw result tuning.
- Big Play layer works (offense & defense), matchup-sensitive, capped, deterministic.
- Defense/Offense AI consider the expanded set; `PREVENT` used only when appropriate.
- All tests pass; artifacts saved; this `Design.md` reflects v1.1e.

#### Future Notes (Phase 5+)
- Expand to 32 franchise-inspired teams with unique offense+defense combos and brand metadata.
- BalanceRunner/BalanceTuner for parity; distinctness matrix.
- Optional situational sub-plays; 2-pt conversions once clock/score model matures further.

##### Appendix A — JSON Hints (matrix bucket)
```json
{
  "INSIDE_POWER": {
    "RUN_BLITZ": {
      "context_rules": [],
      "buckets": [
        {"event":"YARDS","yards_range":[-3,2],"weight":28,"tags":["RUN_STUFF"]},
        {"event":"YARDS","yards_range":[3,4],"weight":8,"tags":["LEG_DRIVE"]},
        {"event":"FUMBLE","yards_range":[-2,2],"weight":2,"offense_recovers":0.5},
        {"event":"PENALTY_DEF","penalty":{"kind":"+5","replay_down":true},"weight":2},
        {"event":"PENALTY_OFF","penalty":{"kind":"-10","replay_down":true},"weight":3}
      ]
    }
  }
}
```

##### Appendix B — Big Play (config sketch)
```json
"big_play": {
  "offense_base": { "SCREEN": 0.008, "DEEP_POST": 0.010, "PA_DEEP": 0.012, "INSIDE_POWER": 0.004, "OUTSIDE_ZONE": 0.005, "QUICK_SLANT": 0.005, "MEDIUM_CROSS": 0.005, "DRAW": 0.006, "QB_SNEAK": 0.002, "PA_SHORT": 0.006, "PUNT": 0.0, "FIELD_GOAL": 0.0 },
  "defense_base": { "ZONE_BLITZ": 0.006, "PRESS_MAN": 0.006, "RUN_BLITZ": 0.004, "BALANCED": 0.003, "PASS_SHELL": 0.003, "PREVENT": 0.002 },
  "matchup_multipliers": { "SCREEN:ZONE_BLITZ": 1.8, "DEEP_POST:PRESS_MAN": 1.6, "INSIDE_POWER:PASS_SHELL": 1.4, "QUICK_SLANT:RUN_BLITZ": 1.4, "DRAW:ZONE_BLITZ": 1.5, "DEEP_POST:PREVENT": 0.5 },
  "offense_types": [ {"kind":"RUN_BREAKAWAY","weight":5}, {"kind":"YAC_EXPLOSION","weight":5}, {"kind":"DEEP_BOMB_TD","weight":3} ],
  "defense_types":  [ {"kind":"PICK_SIX","weight":4}, {"kind":"STRIP_SACK_TD","weight":4}, {"kind":"SCOOP_AND_SCORE","weight":3}, {"kind":"BLOCK_PUNT_TD","weight":1}, {"kind":"BLOCK_FG_TD","weight":1} ],
  "caps": { "offense_bp_max": 0.025, "defense_bp_max": 0.020 }
}
```