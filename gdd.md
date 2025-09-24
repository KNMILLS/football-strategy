# **Gridiron Strategy – Game Design Document**

## 1. Overview

**Game Title:** Gridiron Strategy (working title)
**Genre:** Digital tabletop / strategy simulation
**Platform:** Browser-based (HTML5/JS), expandable to mobile/desktop
**Core Loop:**

1. Choose an offensive deck (Ball Control, Pro Style, Aerial).
2. Select opponent (AI coach persona).
3. Alternate between offense and defense, calling plays via cards.
4. Resolve plays according to matchup tables (driven by JSON + rules tables).
5. Track score, downs, distance, and clock until end of regulation.

The design faithfully adapts the *Avalon Hill Football Strategy* board game while layering modern UX (drag-and-drop cards, Slay the Spire-style hand management) and broadcast-style immersion (play-by-play radio log, NFL-style field presentation).

---

## 2. Core Systems

### 2.1 Possession & Orientation

* **HOME team (player):** always moves **left → right**.
* **AWAY team (AI):** always moves **right → left**.
* Kickoffs, punts, turnovers, and scoring reset orientation rules accordingly.

### 2.2 Play Calling

* **Offense:** player selects a card from their offensive deck (20 unique cards).
* **Defense:** AI selects from its defensive deck (10 unique cards) based on coach persona + context (down, distance, score, field position, clock).
* **Resolution:** Cards are cross-referenced via mapping tables (JSON + rule PDFs). Result is yards gained/lost, turnover, penalty, or special outcome.

### 2.3 Special Plays & Tables

* **Kickoff Table** (normal and onside).
* **Long Gain Table (LG)** for explosive results.
* **Place Kicking Table** for PATs and field goals.
* **Punt Table** for distance and potential returns.
* **Turnover/Penalty nuance** as defined in rules PDFs.
* **Timekeeping Table** governs clock runoff.

### 2.4 AI Coach Personas

* **Andy Reid:** always uses Aerial offense deck. Bias toward aggressive passing.
* **Bill Belichick:** always uses Ball Control deck. Conservative, situational.
* **John Madden:** always uses Pro Style deck. Balanced play-calling.
* **Future:** Add dynamic personas with probabilistic decision trees.

### 2.5 HUD & Presentation

* **Scoreboard:** HOME vs AWAY, quarter, time, possession.
* **Field:** Full 100-yard NFL aesthetic with yard markers, hashmarks, midfield logo, painted end zones. Blue LOS line, yellow first-down line.
* **Cards:** Hand displayed bottom screen. Cards enlarge on hover (300%), drag-and-drop to play. When played, both offensive and defensive cards appear on field for 3 seconds before result.
* **Play Log:** Radio-style commentary with down/distance, field spot, vivid play-by-play. Separator lines between plays.

---

## 3. Rules Fidelity

* Correct orientation handling after every change of possession.
* Incomplete passes reported as “incomplete,” not “0 yards.”
* Penalties described clearly (“Holding on HOME offense, 10-yard penalty from the spot”).
* Clock management (30/45/15 second runoff per play type, 2-minute warning, stoppages).
* PAT/2-point AI choice driven by game context (lead, deficit, time remaining).
* Game cannot end on defensive penalty.
* Extra points attempted after expired clock if needed.

---

## 4. Technical Systems

### 4.1 Assets

* High-resolution offensive and defensive card images (provided).
* Field graphics, logos, HUD text.

### 4.2 Data

* JSON mapping of offensive vs defensive play results.
* Supplemental tables from rules docs (kickoffs, punts, LG, penalties).

### 4.3 Engine

* HTML/CSS/JS core with drag-and-drop interactions.
* Modular: rules logic separated from presentation layer.
* Log generator interprets outcomes → natural language play-by-play.

---

## 5. Current Features

✅ Drag-and-drop play cards (Slay the Spire-inspired).
✅ Three offensive decks and AI opponents.
✅ Card matchups fully mapped from JSON + rules docs.
✅ Scoreboard, downs, distance, possession, clock.
✅ Full field graphics with LOS and first-down lines.
✅ Radio-style play-by-play log.
✅ Special teams (kickoffs, punts, field goals, PATs).

---

## 6. Future Improvements

### 6.1 Field & Presentation

* Animated players/icons moving on field (instead of abstract LOS lines).
* Stadium crowd ambience, sound effects for plays.
* Dynamic weather/lighting (rain, snow, day/night).

### 6.2 Gameplay Depth

* Add fatigue/attrition (certain plays become less effective if overused).
* Hidden tendencies → AI adjusts based on your play-calling patterns.
* Multiple difficulty levels for AI personas.
* Multiplayer (hotseat → online).

### 6.3 Immersion

* Expanded broadcast options: choose between radio or TV commentary styles.
* Commentary personalities with unique voice/phrasing.
* Replay log at end of game with highlights.

### 6.4 Rules Fidelity

* Implement all penalty scenarios (offsetting, repeat down, automatic first down).
* More nuanced clock rules (timeouts, spiking ball, kneel-downs).
* Sudden-death overtime per NFL rules.

### 6.5 Technical

* Save/load game state.
* Full mobile support with responsive layout.
* Expandable modding system for new decks, house rules, alternate eras (college, XFL, 70s NFL).

---

## 7. Development Roadmap

**Phase 1 – Core Gameplay (✅ done):**

* Cards, decks, AI personas, field presentation, rules mapping, basic commentary.

**Phase 2 – Rules Fidelity (in progress):**

* Two-minute warning, penalty nuance, advanced timekeeping.

**Phase 3 – Immersion:**

* Improved commentary, animated plays, crowd/stadium presentation.

**Phase 4 – Expansion:**

* Multiplayer, new AI personas, additional modes.

**Phase 5 – Polish & Release:**

* Full NFL 80s retro aesthetic.
* Mobile optimization.
* Mod support.
