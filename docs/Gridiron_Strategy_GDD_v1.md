# Gridiron Strategy — v1.0 Game Design Document (Markdown)

> Scope: **single self‑contained game**, **Standard rules only**, **scheme‑driven teams (12–16)**, **retro “Madden ’95”** splash/setup & playcalling presentation. Deterministic RNG with seed. No seasons, no meta-progression.

---

## 1) Vision & Pillars

**Vision.** A fast, board‑game‑feel football duel with hidden playcalling, readable outcomes, and distinct **team identities via schemes**, presented with a **Madden ’95‑style** setup and playcalling look. Each match stands alone; learning the teams and anticipating tendencies is the core mastery.

**Pillars**
- **Self‑contained sessions.** One game at a time; no carryover systems.
- **Hidden simultaneous selection.** Offense picks 1 of 6 plays; Defense picks 1 of 4 fronts.
- **Scheme identity.** Small, data‑driven nudges that make teams feel different but fair.
- **Deterministic RNG.** Reproducible with seed; all random draws flow through one manager.
- **Retro clarity.** 90s EA‑era tile grids, bold caps headers, clean banner feedback.
- **Test‑first.** A QA harness that protects rules, determinism, and the retro UI layout.

---

## 2) What’s in / out for v1.0

**In**
- Standard rules only (no clock); TD=7, FG=3; punts, penalties, turnovers.
- 12–16 **scheme teams** (offense scheme × defense shell), selectable in Setup.
- Difficulty: **Rookie / Pro / Legend** (affects AI exploration + counter sharpness).
- Field view: LOS (red), line‑to‑gain (yellow), ball glide animation.
- Retro UI: **Splash → Game Setup → Playcalling → Result banner & log → Final**.

**Out (defer)**
- Seasons/franchises, meta progression, online.
- “Play Sequencer” system (may return later).
- Multiple modes beyond **Standard** (Arcade/Express/Sim).

---

## 3) Game Flow (Screens)

1) **Splash** — “Gridiron Football” title; 1–1.5s fade.
2) **Game Setup (Madden ’95 vibe)** — side‑by‑side tiles:
   - Team 1 / Team 2 (choose any of the shipped teams)
   - Difficulty (Rookie/Pro/Legend)
   - Stadium (cosmetic), Coin Toss, Uniform palette
   - Start
3) **Kickoff → Drives** — hidden playcall each snap, resolve, animate ball spot, banner + log.
4) **Final** — box score, “Play Again”, “Swap Teams”.

*Aesthetic references for the look (tiles, borders, coin toss, play‑select grid) are in §13.*

---

## 4) Core Rules (Standard)

- Ball on 0..100 scale; offense direction ±1.
- **Offense plays (6):** RUN_IN, RUN_OUT, PASS_SHORT, PASS_LONG, PUNT, FG.
- **Defense fronts (4):** RUN_BLITZ, BALANCED, PASS_SHELL, ALL_OUT_RUSH.
- Reveal → resolve via **Base Outcome Matrix** (`Rules.DATA`).
- **First downs:** if net yards to the line-to-gain ≥ 0, reset down to 1 & to_go to 10.
- **Field goals:** distance = LOS + **17** yards (10‑yd end zone + ~7‑yd hold); >57y = OOR.
- **Punts:** net distributions; block chance; **scrimmage‑kick touchback → ball at the 20**.
- **Scoring:** TD=7 (no XP), FG=3. No returns beyond table definitions. No clock.
- **Penalties:** yardage applied; replay down unless stated; can award first down if yardage suffices.

---

## 5) Teams & Schemes (Data‑Driven)

Ship **12–16 teams** that mirror modern NFL archetypes—no licenses, just scheme identity.

### 5.1 Offensive schemes (choose ≥6)
- **West Coast** — high‑percentage, horizontal passing & YAC tilt.
- **Air Raid** — spread, pass‑heavy; quick game + vertical shots; more INT volatility.
- **Wide Zone / Play‑Action** — outside run mid‑gains; PA deep modest bump.
- **Power/Gap** — inside run success ↑, negative‑run variance ↑.
- **RPO/Spread** — safer vs blitz; marginally harder vs deep shell.
- **Balanced Pro** — near‑neutral priors.

### 5.2 Defensive shells (choose 4–5)
- **Cover‑2 / Tampa‑2** — short/intermediate clamp; MLB deep‑drop in Tampa‑2.
- **3‑4 Zone Blitz** — pressure variety; sacks/flags ↑; voids behind pressure.
- **Match Quarters (Cover‑4 family)** — deny explosives with pattern‑match rules.
- **Press‑Man** — squeezes quick game; punished if beaten deep.
- **Multiple** — balanced tendencies.

### 5.3 Team JSON (example)
```json
{
  "team_id": "westcoast_cover2",
  "display_name": "West Coast / Cover-2",
  "offense_scheme": "WEST_COAST",
  "defense_scheme": "COVER2",
  "call_bias": {
    "offense": { "RUN_IN": -0.05, "RUN_OUT": -0.02, "PASS_SHORT": 0.10, "PASS_LONG": -0.03 },
    "defense": { "RUN_BLITZ": -0.05, "BALANCED": 0.05, "PASS_SHELL": 0.05, "ALL_OUT_RUSH": -0.05 }
  },
  "result_tuning": {
    "PASS_SHORT": { "comp_rate": 0.04, "yac_mid": 0.03 },
    "PASS_LONG":  { "int_rate": -0.01 },
    "DEFENSE":    { "sack_rate": -0.01, "penalty_def_plus5": 0.01 },
    "RED_ZONE":   { "short_run_td": -0.02, "short_pass_td": 0.02 }
  }
}
```
**Guidelines**
- Keep multipliers **small** (mostly ±1–5%). The base table remains the backbone.
- At match start, derive immutable **SessionRules** = Base × Team1 × Team2 × Difficulty.

---

## 6) AI (Scheme‑Based; No Sequencer)

**Difficulties**
- **Rookie:** exploration ε≈0.30; bluff 0.20; conservative counters.
- **Pro:** ε≈0.15; bluff 0.10.
- **Legend:** ε≈0.05; bluff 0.05; +25% weight to top counter; smarter 4th‑down posture.

**Defense AI**
- Rolling window **N=12** snaps; bucket by (down, to‑go). Laplace smoothing.
- Choose front that **minimizes expected yards** given observed tendencies + shell bias + difficulty.
- Blend with exploration/bluff; all RNG via `SeedManager`.

**Offense AI (solo)**
- Start from scheme priors; apply situational overrides (short yardage → runs; long yardage → passes).

---

## 7) Presentation & UX (Madden ’95 Homage)

**Look & Feel**
- Dark panel background, **chunky tiles** with thin white keylines, bold caps labels.
- **Playcalling grids**: Offense 6 tiles; Defense 4 tiles. HUD shows Down/Distance, Ball On, Score.
- **Setup**: tile panels for Teams, Difficulty, Stadium, Coin Toss, Uniforms, Start.
- **Banner cadence**: ~1.0s reveal then append to log. Keyboard: 1–6 (offense), QWER (defense).

**FieldView**
- Green field with 5‑yd ticks (10‑yd heavier marks). LOS (red), L2G (yellow). Ball marker glides 0.3–0.4s.

---

## 8) Determinism & RNG

- Single source of randomness: `SeedManager` (wrappers for randf/randi/weighted_choice).
- All AI and tables draw **only** through `SeedManager`.
- Fixed tween durations/easings to keep replays identical.
- Tests assert **RNG call counts** alongside outcomes.

---

## 9) Data & Code Structure

```
res://
  Main.tscn, Main.gd
  scripts/
    GameState.gd      (autoload; flow, possession, state machine)
    Rules.gd          (Base outcome matrix; helpers)
    SessionRules.gd   (derived read-only rules per match from teams+difficulty)
    SeedManager.gd    (RNG; deterministic wrappers)
    DefenseAI.gd      (scheme-aware; difficulty scaling)
    OffenseAI.gd      (scheme-aware; difficulty scaling)
    TeamLoader.gd     (loads res://teams/*.json, validates schema)
  teams/
    *.json            (12–16 team definitions as above)
  ui/
    Splash.tscn
    Setup.tscn
    Playcall.tscn
  tests/
    test_mode_lock.gd
    test_team_identity.gd
    test_scheme_callmix.gd
    test_ai_learning.gd
    test_special_teams.gd
    test_retro_ui_layout.gd
    test_determinism.gd
    test_invariants.gd
    test_fuzz_long.gd
  docs/
    Design.md
    QA_README.md
```

---

## 10) Testing & QA (Godot MCP)

All tests write JSON summaries to `user://qa_artifacts/` and set explicit seeds.

1) **test_mode_lock.gd** — only **Standard** mode exposed; no Sequencer artifacts.
2) **test_team_identity.gd** — each team vs baseline, 5k snaps at fixed seed:
   - West Coast: PASS_SHORT completion +2–5%.
   - Air Raid: deep shot boom ↑; INT +1–2%.
3) **test_scheme_callmix.gd** — call probabilities honor team JSON within tolerance.
4) **test_ai_learning.gd** — Defense AI increases PASS_SHELL rate in 2nd/3rd & long after pass‑heavy window; Legend ≥ +10 p.p. on “top counter” vs Rookie across 1k trials.
5) **test_special_teams.gd** — FG LOS+17; >57 OOR; punts bounded; **touchback → 20**.
6) **test_retro_ui_layout.gd** — snapshot Setup & Playcall; assert tile counts, min margins, header bar height to mimic 90s framing (structure, not pixel‑perfect).
7) **test_determinism.gd** — scripted 5‑snap sequence reproduces outcomes **and** RNG call counts; save HUD screenshot.
8) **test_invariants.gd / test_fuzz_long.gd** — state integrity after every snap; 10k fuzz run clean.

---

## 11) Acceptance Criteria (Ship Gate)

- Splash → **retro Setup** → **retro Playcalling** flow complete & styled.
- **12–16 teams** shipped; each perceptibly distinct, balanced by small multipliers.
- Scheme‑based **AI** with Rookie/Pro/Legend; N=12 learning has visible effect; Legend counters sharper by ≥10 p.p.
- **Standard‑only**; no extra modes.
- Special teams math correct: **FG = LOS + 17**; **scrimmage‑kick touchback = 20**.
- Tests in §10 all **green**; determinism proven via outcomes + RNG call counts.
- `docs/Design.md`, `docs/QA_README.md` updated with this spec and harness usage.

---

## 12) Roadmap (Post‑v1.0, not in this build)

- **v1.1** — Optional Play Sequencer (light), Express ruleset, announcer polish.
- **v1.2** — Team pack expansions; scenario drills; audio pass.
- **Later** — Seasons, online, richer animation systems.

---

## 13) External References (for look & rules context)

- **Madden ’95 UI & framing (tiles, menus, coin toss, play‑select)** — MobyGames screenshot galleries (Genesis/SNES).
- **West Coast offense primer** — short passing, horizontal stretch, YAC emphasis.
- **Air Raid offense overview** — spread formations, high pass rate, quick game + verticals.
- **Tampa‑2 / Cover‑2** — MLB deep drop & short/intermediate zone principles.
- **Zone Blitz / Fire Zone (3‑4)** — pressure with zone behind; LeBeau history.
- **Match Quarters (Cover‑4 family)** — pattern‑match concepts (safeties on #2, MOD rules).
- **Field goal distance** — LOS + 17 yards (10 end zone + ~7 hold); fair‑catch exception differs.
- **Scrimmage‑kick touchback** — NFL rulebook: dead‑ball spot at the **20**.

*(Citations are included in your chat response; keep this list as human‑readable reminders.)*
