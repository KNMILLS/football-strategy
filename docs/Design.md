### Gridiron Strategy — v1.1c (Phase-4)

This document summarizes the shipped v1.0 scope. For the full design narrative and references, see `docs/Gridiron_Strategy_GDD_v1.md`.

#### Core
- Single self-contained game. Standard rules only.
- Deterministic RNG via `SeedManager` with call-count HUD (F1 toggles).
- Base outcome matrix lives in `scripts/Rules.gd` and is immutable. Per-session adjustments are applied via `scripts/SessionRules.gd` from Team JSONs and Difficulty.

#### Presentation (Madden ’95 homage)
- Flow: Splash (1–1.5s) → Setup overlay → Playcalling UI (runs 4, pass 6, specials 2; defense modal 6 fronts).
- HUD shows Down/Distance, Ball On, Score/Drives, Clock (MM:SS), Quarter, Seed and RNG count HUD.
- Controls: 1–6 offense, QWER defense in Hot Seat.

#### Teams & Schemes
- Data-driven JSON in `res://teams/*.json` (12 initial teams).
- Each defines: display name, offense/defense scheme labels, small call-bias tweaks, and tiny result tuning multipliers (generally ±1–5%).
- `TeamLoader.gd` loads/validates; `SessionRules.gd` builds read-only biases, token weight adjustments, and big-play multipliers (capped) per scheme/difficulty.

#### AI
- Difficulty (Rookie/Pro/Legend): exploration ε ≈ 0.30/0.15/0.05; bluff ≈ 0.20/0.10/0.05; Legend adds +25% weight to top counter.
- Defense AI: rolling window N=12 of recent offense calls (Laplace-smoothed), chooses front minimizing expected yards, blended with scheme bias and difficulty.
- Offense AI: scheme-biased priors with situational overrides (short yardage → runs; 2nd/3rd & long → passes), small exploration.

#### Special Teams & Rules
- Field goal distance = LOS + 17; >57 yards is out of range.
- Punts use net distributions with block chance; scrimmage-kick touchback → ball at the 20.
- First downs via line-to-gain; penalties replay unless stated and can award first by yardage.
- Resolution matrix expanded to 12 offense × 6 defense. Base outcome drawn from matchup buckets with `SessionRules` weight multipliers.
- Big Play layer (offense & defense) runs post-draw with matchup multipliers, caps (off ≤ 2.5%, def ≤ 2.0%), deterministic RNG.

#### Timing & Two-Minute
- Base quarter length 15:00 with `timeouts_per_half=3` (future use), configured in `data/timing.json`.
- Per-play base times (examples): RUN_INBOUNDS 33s; PASS_COMPLETE_SHORT_MED 30s; PASS_COMPLETE_DEEP 33s; QB_SNEAK 22s; SACK/INCOMPLETE/OUT_OF_BOUNDS/PENALTY_ACCEPTED/TURNOVER 15s; PUNT_RESOLVED 15s; PUNT_TOUCHBACK 0s; FIELD_GOAL_ATTEMPT 15s; TOUCHDOWN 0s.
- Two-minute mode: when clock ≤ 2:00 in Q2 and Q4, switch to tick timing: 7s per tick; mapping e.g. RUN_INBOUNDS 5 ticks, PASS_COMPLETE_SHORT_MED 4, PASS_COMPLETE_DEEP 5, QB_SNEAK 3, SACK 3, INCOMPLETE/OUT_OF_BOUNDS/PENALTY_ACCEPTED/TURNOVER 1, PUNT_RESOLVED 2, FIELD_GOAL_ATTEMPT 2, TOUCHDOWN 0.
- Deterministic: no RNG in timing; applied immediately after outcome resolution without altering draw order.
- UI shows MM:SS and quarter; a one-time TWO-MINUTE WARNING banner appears at entry (Q2 and Q4 only).

#### Files (key)
- `scripts/Rules12x6.gd` (JSON loader, resolver, Big Play), `scripts/Rules.gd` (compat wrapper)
- `scripts/SessionRules.gd` (token scalars + big-play multipliers), `scripts/SeedManager.gd`
- `scripts/DefenseAI.gd`, `scripts/OffenseAI.gd`, `scripts/GameState.gd`
- `data/rules_12x6.json`, `teams/*.json`, `ui/MainUI.tscn`

#### Tests (see `tests/`)
- Retro UI layout (4/6/2 groups; T/Y fronts), matrix integrity 12×6, big-play trigger rates/types sanity, scheme effects, determinism callcounts.

#### Consistency & Guardrails
- SchemaGuard enforces `schema_version` on rules (`1.1`), timing (`1.0`), and team JSONs (`1.0`). Mismatch is a hard fail.
- OutcomeBuilder normalizes resolver outputs for timing/logging determinism. All outcomes include: `event_name`, `yards_delta`, `turnover`, `touchdown`, `penalty_replay`, `timing_tag`, `ended_inbounds`, `big_play`.
- EventLogger standardizes banners/logs with consistent emojis/verbs.
- Determinism contract: same seed + same play inputs ⇒ identical outcomes and RNG call counts. This is asserted in tests.

#### Acceptance
- 12 offense plays × 6 defense fronts; grouped UI & hotkeys correct.
- Resolver uses context rules, SessionRules pre-draw weight multipliers, and Big Play layer post-draw within caps.
- AI respects expanded set; Prevent situational.
- All tests green; determinism proven (outcomes + RNG call counts).


