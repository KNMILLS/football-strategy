### Gridiron Strategy — v1.0 (Ship Scope)

This document summarizes the shipped v1.0 scope. For the full design narrative and references, see `docs/Gridiron_Strategy_GDD_v1.md`.

#### Core
- Single self-contained game. Standard rules only.
- Deterministic RNG via `SeedManager` with call-count HUD (F1 toggles).
- Base outcome matrix lives in `scripts/Rules.gd` and is immutable. Per-session adjustments are applied via `scripts/SessionRules.gd` from Team JSONs and Difficulty.

#### Presentation (Madden ’95 homage)
- Flow: Splash (1–1.5s) → Setup overlay → Playcalling UI (6 offense tiles, 4 defense via modal).
- HUD shows Down/Distance, Ball On, Score/Drives, Seed and RNG count HUD.
- Controls: 1–6 offense, QWER defense in Hot Seat.

#### Teams & Schemes
- Data-driven JSON in `res://teams/*.json` (12 initial teams).
- Each defines: display name, offense/defense scheme labels, small call-bias tweaks, and tiny result tuning multipliers (generally ±1–5%).
- `TeamLoader.gd` loads/validates; `SessionRules.gd` builds read-only biases and token weight adjustments.

#### AI
- Difficulty (Rookie/Pro/Legend): exploration ε ≈ 0.30/0.15/0.05; bluff ≈ 0.20/0.10/0.05; Legend adds +25% weight to top counter.
- Defense AI: rolling window N=12 of recent offense calls (Laplace-smoothed), chooses front minimizing expected yards, blended with scheme bias and difficulty.
- Offense AI: scheme-biased priors with situational overrides (short yardage → runs; 2nd/3rd & long → passes), small exploration.

#### Special Teams & Rules
- Field goal distance = LOS + 17; >57 yards is out of range.
- Punts use net distributions with block chance; scrimmage-kick touchback → ball at the 20.
- First downs via line-to-gain; penalties replay unless stated and can award first by yardage.

#### Files (key)
- `scripts/Rules.gd`, `scripts/SessionRules.gd`, `scripts/SeedManager.gd`
- `scripts/DefenseAI.gd`, `scripts/OffenseAI.gd`, `scripts/GameState.gd`
- `scripts/TeamLoader.gd`, `scripts/Difficulty.gd`, `teams/*.json`
- `ui/MainUI.tscn` with Splash/Setup overlays

#### Tests (see `tests/`)
- Mode lock, team identity, scheme call mix, AI learning, special teams, retro UI layout, determinism, invariants/fuzz.

#### Acceptance
- Splash → Setup → Playcalling implemented and styled.
- 12–16 teams; scheme differences small but perceptible.
- AI difficulty impacts selection; N=12 learning visible; Legend sharper on counters.
- Standard-only; no Sequencer.
- Special teams guardrails correct (FG LOS+17; touchback to 20).
- All tests green; determinism proven (outcomes + RNG call counts).


