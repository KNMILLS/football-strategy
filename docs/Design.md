# Gridiron Strategy — v1.2 (Authoritative Game Design Document)

This is the canonical design spec. All phases, prompts, and tests derive from this document. If code, prompts, or auxiliary docs disagree with this GDD, this GDD wins.

Note: The current build is mid-Phase 4. Where this v1.2 spec describes future behavior, we call out known deviations so the document remains aligned with what ships today.

---

## 0) Known Deviations (current build)

- Drives UI is present (header shows Drives and a spinner). Pre-game coin flip is not implemented yet; OT coin flip exists.
- Regulation timeouts are not implemented yet; OT timeouts (2/team) are implemented and visible in the HUD.
- Teams load from `res://teams/*.json` (no single `teams_32.json` yet). Legendary coaches are not implemented.
- Timing JSON `schema_version` is "1.0" today; will bump when free kicks are added.

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
- HUD: Down/Distance, Ball On, Score/Drives (present now; to be removed), Clock (MM:SS), Quarter, Seed and RNG count.
- Controls: Offense 1–6; Defense Q/W/E/R/T/Y (Hot Seat modal). Help overlay toggled via `H`.

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
- Core suites include: matrix integrity (12×6); context rule gating; FG range checks; punt nets/touchback; big-play trigger rates/types sanity; scheme effects; AI defense selection; determinism (outcomes+call counts); retro UI layout groups/hotkeys.
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

---

## 2) Game Scope & Mode

* Single, self-contained “Standard” game (no seasons/franchise ties).
* Pre-game coin flip decides initial possession (planned; see §8.1). Current build starts with Home on offense.
* We play by clock, quarters, and rules (OT if tied). Current build also shows a Drives header control (to be removed).
* Local hot-seat (Offense vs Defense) and Solo (Offense vs AI, Defense chosen by AI).

---

## 3) High-Level Flow

1. Splash (1–1.5s) → fades to Setup.
2. Setup

   * Select Home and Away teams (color swatches, archetype tags).
   * Select Difficulty (Rookie/Pro/Legend).
   * Select Quarter Length Preset: Quick (5:00) / Standard (10:00) / Full (15:00).
   * Seed controls: input box + Copy seed (present). Randomize button planned.
   * Start Game → (planned) Pre-game Coin Flip.
3. Pre-game Coin Flip (visiting team calls). Winner chooses Receive or Defend.

   * Until kickoffs (Phase 4.3), Receive starts a series at OWN 25. After 4.3, coin flip flows into kickoff.
4. Playcalling Screen

   * Offense selects 1 of 12 plays; Defense selects 1 of 6 fronts.
   * Reveal → Resolve → Banner + Action Log → Clock consumes → Next snap or administration (Try/Kickoff/OT).
5. End of Regulation → OT if tied (Phase 4.2 rules).
6. Game End → Final banner + summary panel. Optional “Replay seed” button.

---

## 5) Teams, Schemes & Legendary Coaches

### 5.1 Teams (Phase 5)

* Data: `res://data/teams_32.json` with 32 teams, each with a unique (Offense, Defense) pairing. Current build: `res://teams/*.json`.
* Fields (per team):

  * `team_id`, `city`, `name`, `display_name`, `abbrev`
  * `offense_archetype`, `defense_archetype`
  * `call_bias` (tiny pre-draw deltas)
  * `result_tuning` (tiny post-draw nudges)
  * `colors` { `primary`, `secondary`, `accent` }, `logo_hint`
* Uniqueness: planned loader check to enforce unique (O,D) pairs.

### 5.2 Legendary Coaches (Phase 5.1, private)

* Data: `res://coaches/real/*.json` (private use).
* Fields: `coach_id`, `display_name`, `era_tag`, `team_hint`, scheme biases, situational tendencies, flavor.
* Order: Difficulty → Team → Coach → QA overrides. Clamps preserve balance.

---

## 8) Administrative Rules

### 8.1 Coin Flips

* Pre-game coin flip (planned): visiting calls Heads/Tails. Winner chooses Receive/Defend.
  * Before Phase 4.3: “Receive” starts at OWN 25; “Defend” gives opponent that start.
  * After Phase 4.3: choice flows into kickoff.
* Overtime coin flip (implemented): visiting calls at OT entry; winner chooses Receive/Defend for first series.

### 8.2 Timeouts & Clock

* Regulation: 3 per team per half (planned; value exists in `timing.json`).
* OT: 2 per team (implemented), reset at OT start.
* Two-minute warning banners at 2:00 of Q2, Q4, and OT.

---

## 10) Big Play System (clarifications)

* Eligibility & precedence and caps match current implementation. Offensive BP adds +5s if ended inbounds (Timing.apply_modifiers).

---

## 11) Special Teams & After-TD (Phase 4.3)

* Try after TD: Kick (1) ~33-yd from 15 (15s); Two-Point (2) from 2 (15s); TD consumes 0s.
* Kickoffs: TB → B30 (0s), landing-zone returns ~B20–B30 (15s), OOB → B40 (15s unless admin).
* Onside: trailing-only, ~10–15% success, spots A48/A45 (15s).
* Data: `res://data/free_kick.json`; map `KICKOFF_RESOLVED` to 15s in `timing.json`.

---

## 16) Files & Structure (expanded)

```
res://Main.tscn, res://Main.gd
res://scripts/
  GameState.gd               (autoload; state machine)
  Rules12x6.gd               (resolver + big play)
  Rules.gd                   (compat wrapper for legacy IDs)
  SessionRules.gd            (composition & clamps)
  DefenseAI.gd, OffenseAI.gd
  SeedManager.gd             (single RNG source)
  Timing.gd                  (clock + two-minute)
  SchemaGuard.gd
  OutcomeBuilder.gd
  EventLogger.gd
  TeamLoader.gd
  FreeKick.gd                (future)
  CoachLoader.gd             (future)
res://data/
  rules_12x6.json
  timing.json
  free_kick.json             (future)
  teams_32.json              (future)
  coaches/real/*.json        (future)
res://ui/
  MainUI.tscn (+ header, setup, modals)
res://tests/*.gd
res://tools/
  BalanceRunner.gd
  SimReport.gd
docs/Design.md (this file)
```

---

## 17) Acceptance Checklists (phases)

- Phase 4.0: 12×6 + Big Play deterministic; caps enforced; tests pass.
- Phase 4.Timing: per-play seconds; two-minute ticks; mm:ss determinism.
- Phase 4.1: quarter presets and remove Drives UI; rollover; tests pass.
- Phase 4.2: OT fair-possession; OT coin toss; 2 OT TOs; tie at expiry.
- Phase 4.3: Try/XP/2-pt and Free Kicks (kickoff/onside) with timing; tests pass.
- Phase 5: 32 teams unique pairs; BalanceRunner targets; tests pass.
- Phase 5.1: real teams/coaches (private) with measurable AI shifts.
- Phase 6: AI v2 (12-play awareness) + difficulty polish.
- Phase 7–10: polish, balance/UX, refactor, packaging & docs.

---

## 18) JSON Reference (snippets)

### 18.2 Big Play Config (sketch) — unchanged

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

### 18.5 Timing (excerpt — current build)

```json
{
  "schema_version": "1.0",
  "quarter_presets": { "QUICK": 300, "STANDARD": 600, "FULL": 900 },
  "default_preset": "STANDARD",
  "base_tc": { "RUN_INBOUNDS":33, "PASS_COMPLETE_SHORT_MED":30, "PASS_COMPLETE_DEEP":33, "QB_SNEAK":22, "SACK":15, "INCOMPLETE":15, "OUT_OF_BOUNDS":15, "PENALTY_ACCEPTED":15, "TURNOVER":15, "PUNT_RESOLVED":15, "PUNT_TOUCHBACK":0, "FIELD_GOAL_ATTEMPT":15, "TOUCHDOWN":0, "SPIKE":5, "KNEEL":5 },
  "two_minute_ticks": { "seconds_per_tick": 7, "map": { "RUN_INBOUNDS":5, "PASS_COMPLETE_SHORT_MED":4, "PASS_COMPLETE_DEEP":5, "QB_SNEAK":3, "SACK":3, "INCOMPLETE":1, "OUT_OF_BOUNDS":1, "PENALTY_ACCEPTED":1, "TURNOVER":1, "PUNT_RESOLVED":2, "FIELD_GOAL_ATTEMPT":2, "TOUCHDOWN":0, "SPIKE":1, "KNEEL":1 } }
}
```

---

## 19) Development Roadmap (phase overview)

* P4.0 — 12×6 matrix + Big Play (off/def).
* P4.Timing — Clock + two-minute tick system.
* P4.1 — Quarter length presets (5/10/15) and remove Drives UI.
* P4.2 — OT (2025 fair-possession), OT length = preset, OT coin flip, 2 timeouts, tie allowed.
* P4.3 — After-TD (XP/2-pt), Kickoffs, Onside.
* P5 — 32 teams (unique archetype pairs) + BalanceRunner.
* P5.1 — Real teams & legendary coaches (private build).
* P6 — AI v2 (12-play awareness) + difficulty polish.
* P7 — Visual/Audio polish (retro-clean).
* P8 — Balance & UX pass (onboarding, accessibility, autotune clamps).
* P9 — Godot 4.4 refactor (best practices, readability/maintainability, profiler-guided perf).
* P10 — Packaging & docs (exports, CI gates, GDD v1.2).

---

## 20) Non-Goals (for 1.0)

* No franchise/season, no rosters or player ratings.
* No network multiplayer.
* No real-time twitch action; this is strategic, snap-to-snap.
* No kick/punt return animations; outcomes are resolved with clean banners and spot updates.

---

## 21) Notes for Future Agents

* Read this GDD first; reference sections and acceptance checklists in every phase prompt.
* Keep determinism sacred: never introduce RNG outside `SeedManager`; never reorder existing random draws.
* When adding data, bump `schema_version` and update `SchemaGuard` and tests.
* Add tests for all new logic; use golden replay where applicable.
* Split multi-system changes across phases.