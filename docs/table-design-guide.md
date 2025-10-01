# Table Design Guide for 2d20 Dice Engine

## Overview

This guide provides instructions for authoring matchup tables for the Gridiron Strategy 2d20 dice engine. The system uses enumerated outcome tables (sums 3-39) for every offensive card vs. defensive card combination.

## Table Structure

Each matchup table is a JSON file with the following structure:

```json
{
  "version": "1.0.0",
  "off_card": "Play Name",
  "def_card": "Defense Name",
  "dice": "2d20",
  "entries": {
    "3": { "yards": -2, "clock": "10", "tags": ["short", "incompletion"] },
    "4": { "yards": -1, "clock": "10", "tags": ["short", "incompletion"] },
    // ... entries 3-39
    "39": { "yards": 25, "clock": "20", "tags": ["explosive", "completion", "first_down"] }
  },
  "doubles": {
    "1": { "result": "DEF_TD" },
    "20": { "result": "OFF_TD" },
    "2-19": { "penalty_table_ref": "penalty_table_v1" }
  },
  "meta": {
    "oob_bias": false,
    "field_pos_clamp": true,
    "risk_profile": "low",
    "explosive_start_sum": 25
  }
}
```

## Design Principles

### 1. Clumpy Distributions

**Boom-Bust Patterns**: Create realistic clustering of outcomes rather than uniform distributions.

- **Deep Pass Tables**: High incompletion rates in mid-range (10-25), explosive gains in high range (30-39)
- **Short Game Tables**: Consistent positive gains with minimal negative plays
- **Run Game Tables**: Modest but reliable gains with occasional big plays

### 2. OOB Bias for Perimeter Plays

- Set `"oob_bias": true` for perimeter plays (outside runs, sideline passes)
- Include `"oob": true` in entries 3-19 for higher OOB rates
- Reserve OOB for truly perimeter-focused plays only

### 3. Turnover Clustering

- **Turnover Band**: Always include entries 3-5 for minimum turnover band
- Cluster turnovers in low sums (3-7) for INT/FUM outcomes
- Use appropriate return yardage based on play type and field position

### 4. Clock Management

- **10" Clock**: Short passes, quick runs, negative plays
- **20" Clock**: Intermediate passes, moderate runs, first downs
- **30" Clock**: Long developing runs, clock-draining plays

### 5. Risk Profiles

- **Low Risk** (≤5% turnovers): Consistent, reliable plays
- **Medium Risk** (5-10% turnovers): Balanced risk/reward
- **High Risk** (10-20% turnovers): Boom-bust, high variance

## Archetype Guidelines

### West Coast Offense
- **Focus**: Rhythm, timing, YAC
- **Clock**: Mixed 10"/20" usage
- **Risk**: Low-medium
- **Explosive Start**: 25+

### Spread Offense
- **Focus**: Spacing, tempo, mismatches
- **Clock**: Heavy 20" usage
- **Risk**: Medium
- **Explosive Start**: 28+

### Air Raid Offense
- **Focus**: Vertical volume, deep seams
- **Clock**: Heavy 20" usage
- **Risk**: High
- **Explosive Start**: 35+

### Smashmouth Offense
- **Focus**: Downhill, clock drain
- **Clock**: Heavy 30" usage
- **Risk**: Low-medium
- **Explosive Start**: 30+

### Wide Zone Offense
- **Focus**: Zone schemes, bootlegs
- **Clock**: Mixed 20"/30" usage
- **Risk**: Medium
- **Explosive Start**: 28+

## Tags System

Use descriptive tags to categorize outcomes:

```json
"tags": ["short", "completion", "first_down"]
"tags": ["deep", "incompletion", "oob"]
"tags": ["turnover", "interception", "blitz_pickup"]
"tags": ["run", "explosive", "first_down"]
```

**Common Tag Categories:**
- **Play Type**: `run`, `pass`, `boot`, `sack`
- **Result**: `completion`, `incompletion`, `turnover`, `first_down`
- **Range**: `short`, `intermediate`, `deep`, `explosive`
- **Context**: `blitz_disruption`, `oob`, `negative`

## Validation Checklist

Before submitting tables:

- [ ] All 37 entries (3-39) present and valid
- [ ] Entries 3-5 included for turnover band
- [ ] Turnover outcomes have valid return yardage
- [ ] OOB bias only on perimeter plays
- [ ] Clock values are 10, 20, or 30 only
- [ ] Risk profile matches distribution patterns
- [ ] Explosive start sum appropriate for risk level
- [ ] Tags are descriptive and consistent
- [ ] Schema validation passes
- [ ] Distribution analysis shows desired clumpiness

## Testing

Run the distribution analysis script:

```bash
node scripts/analyze-table-distributions.mjs
```

This provides:
- Turnover rate analysis
- OOB bias verification
- Consistency scoring
- Risk profile validation
- Overall statistical summary

## File Naming Convention

`[PLAYBOOK]_[OFFENSE_PLAY]_vs_[DEFENSE_PLAY].json`

Examples:
- `WEST_COAST_SLANT_vs_COVER_2.json`
- `AIR_RAID_FOUR_VERTS_vs_MAN_FREE.json`
- `SMASHMOUTH_POWER_O_vs_ZONE_BLITZ.json`

## Performance Considerations

- Tables load in < 50ms per table
- Keep JSON files under 10KB each
- Use consistent formatting for maintainability
- Consider field position impact on outcome selection

## Future Enhancements

- Weather effects on OOB rates
- Player ability modifiers
- Fatigue/conditioning impacts
- Advanced penalty choice strategies
- Dynamic explosive thresholds
