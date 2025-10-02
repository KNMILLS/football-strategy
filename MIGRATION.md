# V1 Dice Engine & New Decks Migration Guide

This document explains the new 2d20 dice engine system and five offensive playbooks implemented for the V1 release.

## MVP Status - ✅ COMPLETE

**As of October 2025, the Gridiron Strategy project has achieved true MVP status:**

### ✅ Phase E - Content Coverage (COMPLETE)
- **≥300 matchup tables**: 321 tables now available (281 + 40 new)
- **Air Raid expansion**: Added `ar-post-corner` and `ar-levels` with full 10-defense coverage
- **Spread expansion**: Added `spread-levels-concept` and `spread-post-wheel` with full 10-defense coverage

### ✅ Phase F - OOB & Clock Audit (COMPLETE)
- **Perimeter OOB consistency**: 80 tables updated with OOB entries for mid-range sums (18-28)
- **Clock enforcement**: All OOB entries use `clock: "10"` as required
- **Regression testing**: `test/perimeter-oob.test.ts` validates compliance

### ✅ Phase G - Commentary Expansion (COMPLETE)
- **Enhanced taglines**: `src/narration/taglines.json` with ≥5 variants per key tag
- **Key tags covered**: `sack`, `pressure`, `turnover:INT`, `turnover:FUM`, `explosive`, `boundary`, `checkdown`, `coverage_bust`, `stuff`
- **Penalty variants**: Clear penalty descriptions integrated into commentary system
- **Testing**: Commentary variety validated in `tests/narration/commentary-variety.test.ts`

### ✅ Phase H - Integration & Testing (COMPLETE)
- **Quarter simulation**: `npm run sim:quarter` runs full quarter vs AI without crashes
- **Documentation**: `docs/table-authoring-guide.md` updated with OOB and commentary guidance

### 🎯 Acceptance Criteria Met
1. ✅ `npm run typecheck` passes
2. ✅ `npm run lint` passes
3. ✅ `npm run test` passes (including new OOB + commentary tests)
4. ✅ `npm run validate-tables` passes with ≥300 tables
5. ✅ `npm run sim:matchup` outputs plausible histograms
6. ✅ `npm run sim:quarter` runs seeded quarter without errors
7. ✅ Manual half-game: fully playable with variety, penalties, OOB, and correct clock/distance

**The project is now a true MVP - full games can be played start to finish without fallback paths, with varied commentary, consistent OOB behavior, and comprehensive test coverage.**

## Overview

The new system replaces the deterministic card-based resolution with a 2d20 dice mechanic featuring:
- **Clumpy distributions** for realistic football outcomes
- **Doubles system** for touchdowns and penalties
- **Field position clamping** to prevent unrealistic yardage
- **Five new offensive playbooks** with 20 plays each
- **Feature flag system** for safe rollout

## Table Schema

### MatchupTable Schema

Each matchup table must follow this structure:

```typescript
{
  "version": "1.0",
  "off_card": "OFFENSIVE_PLAY_ID",
  "def_card": "DEFENSIVE_PLAY_ID",
  "dice": "2d20",
  "entries": {
    // All sums 3-39 must be present
    "3": { "yards": number, "clock": "10"|"20"|"30", "tags": string[], "turnover"?: {...}, "oob"?: boolean },
    "4": { /* ... */ },
    // ... up to
    "39": { /* ... */ }
  },
  "doubles": {
    "1": { "result": "DEF_TD" },
    "20": { "result": "OFF_TD" },
    "2-19": { "penalty_table_ref": "PENALTY_1_TO_10" }
  },
  "meta": {
    "oob_bias": boolean,
    "field_pos_clamp": boolean,
    "risk_profile": "low"|"medium"|"high",
    "explosive_start_sum": number // 20-39
  }
}
```

### Key Requirements

1. **Complete coverage**: All dice sums 3-39 must have entries
2. **Clock values**: Only "10", "20", or "30" allowed
3. **Turnover format**: Use "INT"|"FUM" for type, "LOS" for return_to
4. **Field clamping**: When `field_pos_clamp: true`, yards are clamped to field boundaries
5. **Doubles**: Must include DEF_TD (1-1), OFF_TD (20-20), and penalty reference (2-19)

### PenaltyTable Schema

```typescript
{
  "version": "1.0",
  "entries": {
    "1": { "side": "offense"|"defense"|"offset", "yards"?: number, "auto_first_down"?: boolean, "loss_of_down"?: boolean, "replay_down"?: boolean, "override_play_result"?: boolean, "label": string },
    // ... up to "10"
  }
}
```

**Override Rules**:
- Rolls 4, 5, 6: `override_play_result: true` (replay/enforce penalty only)
- Other rolls: `override_play_result: false` (show accept/decline option)

## Adding New Matchup Tables

1. Create JSON file in `fixtures/tables_v1/`
2. Follow the schema above
3. Run `npm run validate:tables` to verify
4. Test with `npm run sim:matchup <offId> <defId> --rolls 10000`

Example:
```bash
npm run sim:matchup AIRRAID_PA_DEEP_SHOT DEF_INSIDE_BLITZ --rolls 100000
```

## Validation

### Running Table Validation

```bash
npm run validate:tables
```

This validates:
- All required sums 3-39 are present
- Clock values are valid
- Doubles outcomes are complete
- Field position clamping works correctly
- Penalty table structure is valid

### Manual Validation

The `validate:tables` script scans the `data/` directory recursively for JSON files and validates them against the schemas.

## Simulation Harness

### Basic Usage

```bash
npm run sim:matchup <offCardId> <defCardId> [--rolls N]
```

### Example Output

```
🎲 Running simulation: AIRRAID_PA_DEEP_SHOT vs DEF_INSIDE_BLITZ (100,000 rolls)

📊 Simulation Results
==================================================

🎯 Outcome Distribution:
  NORMAL: 86,543 (86.54%)
  PENALTY_OVERRIDE: 3,247 (3.25%)
  PENALTY_WITH_BASE: 8,210 (8.21%)
  DEF_TD: 1,000 (1.00%)
  OFF_TD: 1,000 (1.00%)

📏 Yardage Statistics:
  Average yards: 12.34
  Turnovers: 2,145 (2.15%)
  Out of bounds: 15,432 (15.43%)

📈 Yardage Distribution:
  ≤ -10: 1,234 (1.23%)
  -9 to -4: 3,456 (3.46%)
  -3 to 0: 8,765 (8.77%)
  1 to 4: 12,345 (12.35%)
  5 to 9: 18,765 (18.77%)
  10 to 19: 25,432 (25.43%)
  ≥ 20: 29,003 (29.00%)

==================================================
```

## New Offensive Playbooks

Five new playbooks are available:

1. **West Coast** (`WEST_COAST`) - Short-to-medium passing with timing routes
2. **Spread** (`SPREAD`) - Four wide receiver formations emphasizing space
3. **Air Raid** (`AIR_RAID`) - Aggressive downfield passing
4. **Smashmouth** (`SMASHMOUTH`) - Power running with play action
5. **Wide Zone** (`WIDE_ZONE`) - Outside zone running with perimeter blocking

Each playbook contains 20 plays with:
- Unique IDs and names
- Type classification (`run`, `pass`, `pa`, `trick`)
- Depth categorization (`short`, `mid`, `deep`)
- Risk profile (`low`, `medium`, `high`)
- Optional perimeter flag

## Feature Flags

### Engine Selection

The system uses feature flags for safe rollout:

```typescript
// Check current engine
import { getCurrentEngine, setEngine } from './src/config/FeatureFlags';

console.log(getCurrentEngine()); // 'deterministic' | 'dice'

// Switch engines
setEngine('dice');
```

### Environment Control

Set `GRIDIRON_ENGINE=dice` or `GRIDIRON_ENGINE=deterministic` for CI/deployment.

### UI Integration

The `NEW_ENGINE_V1` flag controls whether the dice engine is available in the UI.

## Resolver API

### resolveSnap Function

```typescript
import { resolveSnap } from './src/rules/ResolveSnap';

const result = resolveSnap(
  'OFF_CARD_ID',
  'DEF_CARD_ID',
  matchupTable,    // MatchupTable object
  penaltyTable,    // PenaltyTable object
  gameState,       // GameState object
  rng              // RNG function
);
```

### Result Structure

```typescript
type ResolveResult = {
  base?: { yards?: number; turnover?: {...}; oob?: boolean; clock: "10"|"20"|"30"; tags?: string[] };
  penalty?: { side: "offense"|"defense"|"offset"; yards?: number; auto_first_down?: boolean; loss_of_down?: boolean; replay_down?: boolean; override_play_result?: boolean; label: string };
  doubles?: { kind: "DEF_TD"|"OFF_TD"|"PENALTY" };
  options?: { can_accept_decline: boolean };
}
```

## Testing

### Unit Tests

```bash
npm test -- tests/rules/ResolveSnap.test.ts
```

Tests cover:
- Normal 2d20 resolution
- All doubles outcomes (DEF_TD, OFF_TD, penalties)
- Field position clamping
- Turnover handling
- Clock and OOB preservation
- Edge cases and error conditions

### Integration Tests

The existing integration test suite validates:
- UI rendering with new engine
- Feature flag switching
- Game state consistency
- Performance benchmarks

## Migration Checklist

- [x] Update schemas for 2d20 format
- [x] Create canonical penalty table
- [x] Implement resolveSnap resolver
- [x] Add table validation
- [x] Create seed matchup tables
- [x] Define five offensive playbooks
- [x] Add feature flag system
- [x] Create simulation harness
- [x] Write comprehensive tests
- [x] Document migration process

## Rollout Plan

1. **Phase 1**: Feature flags enabled, new engine available in dev mode
2. **Phase 2**: A/B testing with subset of users
3. **Phase 3**: Full rollout with legacy fallback
4. **Phase 4**: Legacy engine removal (future release)

## Troubleshooting

### Common Issues

1. **Missing dice sums**: Run `npm run validate:tables` to identify gaps
2. **Invalid clock values**: Check that all entries use "10", "20", or "30"
3. **Field clamp failures**: Ensure `field_pos_clamp: true` in meta for testing
4. **Penalty table errors**: Verify 10 entries with correct override flags

### Debugging

Use the simulation harness to test specific matchups:

```bash
npm run sim:matchup YOUR_OFFENSE YOUR_DEFENSE --rolls 10000
```

## Future Enhancements

- Additional offensive/defensive playbooks
- Advanced penalty table variations
- Weather and field condition modifiers
- Player skill impact on outcomes
- Advanced statistical analysis tools
