# Gridiron Strategy — GDD v1.1

> Single-game, retro-style, drive-based American football strategy game inspired by classic tabletop titles. Deterministic RNG with optional seed. Standard mode only (no seasons/franchise). This document supersedes prior versions.

---

## 1) Vision & Pillars

* **Fast, readable strategy**: hidden, simultaneous selection (Offense vs Defense) with compact outcomes.
* **Retro presentation**: Splash → Setup → Playcalling reminiscent of *Madden ’95* layout.
* **Deterministic & testable**: all randomness flows through a single seed manager; reproducible sims.
* **Team identity**: iconic offensive/defensive archetypes subtly bias call mix and outcomes (no roster stats).
* **Now in v1.1**: 12 offensive plays × 6 defensive fronts; matchup-aware **Big Play** system for rare explosive outcomes on both sides.

---

## 2) Scope (v1.1)

### Game Mode

* **Standard**: one self-contained game. No clock (v1.1), no extra points/2-pt conversions, no returns outside explicit rules. Drive-based scoring: TD = 7, FG = 3.

### Field/Downs

* Drives start at own 25. 4 downs to gain 10 yards. Ball position 0..100 (absolute); offense has `dir = +1` for home, `-1` for away.

### Playbooks

**Offense – 12 Plays**

1. **INSIDE\_POWER** (run)
2. **OUTSIDE\_ZONE** (run)
3. **DRAW** (run)
4. **QB\_SNEAK** (run, short-yardage)
5. **QUICK\_SLANT** (short pass)
6. **SCREEN** (short pass vs pressure)
7. **MEDIUM\_CROSS** (intermediate)
8. **DEEP\_POST** (vertical)
9. **PA\_SHORT** (play-action, short)
10. **PA\_DEEP** (play-action, deep)
11. **PUNT** (special)
12. **FIELD\_GOAL** (special)

**Defense – 6 Fronts**

* **RUN\_BLITZ**, **BALANCED**, **PASS\_SHELL** (zone), **PRESS\_MAN**, **ZONE\_BLITZ**, **PREVENT**.

---

## 3) UI & Controls (Retro)

### Flow

* **Splash** → **Setup** → **Playcalling** (single screen) → outcome banner → log.

### Setup (Madden ’95 vibe)

* Team 1 / Team 2 selectors (from preset team list), Difficulty (Rookie/Pro/Legend), Drives count, Seed input, Start/Reset Seed.
* Show each team’s **display name**, **city**, **offense/defense tags**, and **color accent**.

### Playcalling Screen

* Offense tile groups:

  * **Runs (4)**: hotkeys `1–4`
  * **Pass (6)**: hotkeys `5–0` (0 = PA\_DEEP)
  * **Special (2)**: buttons for **Punt** and **Field Goal**
* Defense (Hot Seat) modal:

  * **Q** RUN\_BLITZ, **W** BALANCED, **E** PASS\_SHELL, **R** PRESS\_MAN, **T** ZONE\_BLITZ, **Y** PREVENT
* Status panel: Score, Drive #, Ball Spot (OWN/50/OPP layout), Down & To Go.
* Outcome banner (fade in/out). Action log with emojis:

  * Gains 📈, Sack 💥, INT 🛑, Fumble ⚠️, Flag 🚩, FG/Punt 🏈
  * **Big Play**: Offense 🔥, Defense 🛡️

---

## 4) Core Resolution Model

### Data-Driven Matrix (12×6)

* For each (OFF\_PLAY, DEF\_FRONT), a small set of **buckets** with weights:

  * `event`: `YARDS` (with `yards_range`), `INCOMP`, `SACK`, `INT`, `FUMBLE` (with `offense_recovers`), `PENALTY_OFF/DEF` (with `kind`, `replay_down`, `auto_first_down`), or specials (`FG_GOOD/MISS`, punt nets/block).
  * Optional `context_rules` to **allow/deny tags** (e.g., `QB_SNEAK` short-yardage only).
* Resolver steps:

  1. Filter buckets by `context_rules`.
  2. Apply **SessionRules** multipliers to **bucket weights** (pre-draw).
  3. **Weighted draw** → materialize event (yards/flag/turnover/etc.).
  4. Apply **result\_tuning** (post-draw micro-deltas), clamp to invariants.
  5. Evaluate **Big Play** (see §5), possibly overriding with a rare explosive result.

### Specials

* **Field Goal**: LOS + 17 distance; buckets: 0–39, 40–49, 50–57; out of range = automatic “cannot attempt”.
* **Punt**: weighted net yard table + block chance; touchback to 20.

---

## 5) Big Play System (Offense & Defense)

**Goal:** Rare, deterministic, **matchup-sensitive** explosive outcomes that amplify the cat-and-mouse.

### Triggers & Caps

* Base per-play chances (very small) for offense; base per-front chances for defense.
* **Matchup multipliers** (e.g., `SCREEN:ZONE_BLITZ` ↑, `DEEP_POST:PREVENT` ↓).
* **Scheme/difficulty** may nudge (±10%) within caps.
* Hard caps (suggested): `offense ≤ 2.5%`, `defense ≤ 2.0%` after all mods.

### Eligibility & Precedence

* **Offense Big Play**: base event must be a positive gain or completed pass.
* **Defense Big Play**: base event must be `INT`, `FUMBLE` (DEF recovers), `SACK+fumble`, or kick **BLOCK**.
* **Conflict**: If both eligible, prioritize the one consistent with the base event (turnover/block → **defense** first; otherwise **offense** first). If first fails, test the other.

### Result Types

* **Offense**:

  * **RUN\_BREAKAWAY**: convert to +20..60 yards or TD if in range (missed tackles).
  * **YAC\_EXPLOSION**: short pass becomes long gain (+15..45) / TD.
  * **DEEP\_BOMB\_TD**: vertical shot becomes instant TD (40..80 yards).
* **Defense**:

  * **PICK\_SIX**, **STRIP\_SACK\_TD**, **SCOOP\_AND\_SCORE**.
  * **BLOCK\_PUNT\_TD**, **BLOCK\_FG\_TD** (rare; only on block events).

**All random draws** (trigger, type, extra yards) come from `SeedManager`.

---

## 6) Teams & Archetypes

### Archetype Palette

* **Offense**: Balanced Pro; West Coast; Air Raid/Vertical; Power Run; RPO Hybrid/Read Option; Wide Zone/Play-Action; (optional) Run & Shoot / Multiple.
* **Defense**: Base 4-3; Base 3-4; Cover-2/Tampa-2; Match/Quarters (Cover-3/4 family); Press Man; Zone Blitz/Hybrid Pressure; Forty-Six; (special) Wide-9; Flex.

### Team JSON (per team)

* `team_id`, `display_name`, `city`
* `offense_scheme`, `defense_scheme`
* `call_bias` (small deltas for offense/defense call selection)
* `result_tuning` (small deltas like `comp_rate`, `int_rate`, `sack_rate`, `mid_gain`, `boom_gain`, `penalty_def_plus5`)
* **Design**: `colors {primary, secondary, accent}`, `logo_description`, `uniform_description`
* (Later in Phase 5): ensure all 32 franchises use **unique offense+defense combos**; if duplicate, more iconic franchise keeps it, the other takes its **second-most famous** identity.

### SessionRules Composition

`SessionRules = BaseRules × Team1 × Team2 × Difficulty`

* Pre-draw: multiply **bucket weights** by scheme/difficulty scalars.
* Post-draw: apply **result\_tuning** clamps.
* Big Play: `p_off`, `p_def` multipliers per scheme within caps.

---

## 7) AI (v1.1 basics)

* **DefenseAI**: track recent opponent play histogram (window \~12 snaps) with down/distance features; choose front to minimize expected yards with small **exploration** (depends on difficulty). Use **PREVENT** only for long-yardage or end-drive heuristics.
* **OffenseAI**: priors from situation & scheme:

  * `QB_SNEAK` on ≤2; `PA_*` more likely after successful runs; `SCREEN` vs blitzy trends; `DEEP_POST` gated by risk tolerance/difficulty.

---

## 8) Determinism & Invariants

* **Seed set** at session start; **all** randomness via `SeedManager`.
* Replaying same inputs (plays, fronts, seed) yields identical:

  * Outcomes (yards/events), **Big Play triggers & types**, and RNG **call counts**.
* Invariants: yard bounds 0..100; down/first down logic correct; penalties with `replay_down` do not advance downs; turnovers end drive immediately.

---

## 9) Testing & QA (via godot-mcp)

### Core Suites (new/updated)

1. **`test_matrix_integrity_12x6.gd`**

   * All 72 offense×defense pairs exist; each has ≥1 enabled bucket after context; bucket weights sum > 0.

2. **`test_bigplay_trigger_rates.gd`**

   * Over large sims (e.g., 50k snaps, golden seeds):

     * Offense Big Play rate ≈ 0.6–1.5%; Defense Big Play ≈ 0.3–1.2%.
     * **Screen vs Zone Blitz** offense BP ≥ 1.6× baseline; **Prevent** reduces offense BP (≤0.7× baseline).

3. **`test_bigplay_types_sanity.gd`**

   * PICK\_SIX only on INT; STRIP\_SACK\_TD only on sack+fumble; block-TDs only on blocked kicks; deep bomb only for deep/PA deep.

4. **`test_scheme_effects_12x6.gd`**

   * Air Raid: `DEEP_POST` boom↑/INT↑ small; West Coast: `QUICK_SLANT` comp/YAC↑; Power Run: `INSIDE_POWER` success↑, `PA_DEEP` boom↑.

5. **`test_ai_defense_selection_v2.gd`**

   * Front usage shifts appropriately vs observed tendencies; **PREVENT** only in long-yardage.

6. **`test_determinism_callcounts.gd`**

   * Same seed reproduces outcomes and RNG call counts.

7. **`test_retro_layout_groups.gd`**

   * UI has 3 groups (4/6/2), hotkeys bound, two new defense fronts present (T/Y).

### Artifacts

* Save JSON summaries and screenshots (Setup, Playcalling) to `user://qa_artifacts/`.

---

## 10) Files & Structure (key)

* `res://Main.tscn`, `res://Main.gd`
* `res://scripts/GameState.gd` (autoload)
* `res://scripts/Rules12x6.gd` (loads `res://data/rules_12x6.json`, resolver + Big Play)
* `res://scripts/SessionRules.gd` (composition & clamps)
* `res://scripts/DefenseAI.gd`, `res://scripts/OffenseAI.gd` (v1.1 logic)
* `res://data/rules_12x6.json` (matrix, specials, big\_play tables)
* `res://teams/*.json` (teams; Phase 5 expands to 32)
* `res://ui/MainUI.tscn` / `ui/Playcall.tscn` (grouped tiles)
* `res://tests/*.gd` (as listed)
* `res://docs/Design.md` (this file v1.1)

---

## 11) Acceptance Checklist (v1.1 / Phase 4)

* 12 offense plays and 6 defense fronts implemented; grouped UI with correct hotkeys.
* Resolver uses context rules, SessionRules pre-draw weight multipliers, and post-draw result tuning.
* **Big Play** layer works (offense & defense), matchup-sensitive, within caps, deterministic.
* Defense/Offense AI consider the expanded set; **PREVENT** used only when appropriate.
* All tests pass; artifacts saved; **Design.md** updated to v1.1.

---

## 12) Future Notes (Phase 5+)

* **32 franchise-inspired teams** with **unique** offense+defense combos (no duplicates; use second-most iconic identity where needed), color/brand metadata.
* **BalanceRunner/BalanceTuner** for parity (WR 45–55% vs field), budget caps, distinctness matrix.
* Optional “situational sub-plays” (later): e.g., Draw vs. specific looks, Trick/Gadget, 2-pt conversions once a clock/score model exists.

---

### Appendix A — JSON Hints (matrix bucket)

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

### Appendix B — Big Play (config sketch)

```json
"big_play": {
  "offense_base": { "SCREEN": 0.008, "DEEP_POST": 0.010, "PA_DEEP": 0.012, "INSIDE_POWER": 0.004, "OUTSIDE_ZONE": 0.005, "QUICK_SLANT": 0.005, "MEDIUM_CROSS": 0.005, "DRAW": 0.006, "QB_SNEAK": 0.002, "PA_SHORT": 0.006, "PUNT": 0.0, "FIELD_GOAL": 0.0 },
  "defense_base": { "ZONE_BLITZ": 0.006, "PRESS_MAN": 0.006, "RUN_BLITZ": 0.004, "BALANCED": 0.003, "PASS_SHELL": 0.003, "PREVENT": 0.002 },
  "matchup_multipliers": { "SCREEN:ZONE_BLITZ": 1.8, "DEEP_POST:PRESS_MAN": 1.6, "INSIDE_POWER:PASS_SHELL": 1.4, "QUICK_SLANT:RUN_BLITZ": 1.4, "DRAW:ZONE_BLITZ": 1.5, "DEEP_POST:PREVENT": 0.5 },
  "offense_types": [ {"kind":"RUN_BREAKAWAY","weight":5}, {"kind":"YAC_EXPLOSION","weight":5}, {"kind":"DEEP_BOMB_TD","weight":3} ],
  "defense_types":  [ {"kind":"PICK_SIX","weight":4}, {"kind":"STRIP_SACK_TD","weight":4}, {"kind":"SCOOP_AND_SCORE","weight":3}, {"kind":"BLOCK_PUNT_TD","weight":1}, {"kind":"BLOCK_FG_TD","weight":1} ],
  "caps": { "offense_bp_max": 0.025, "defense_bp_max": 0.020 }
}
