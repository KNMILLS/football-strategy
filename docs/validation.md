# Validation Framework & Safety Rails

## Overview

This document describes the comprehensive validation framework that ensures data integrity and provides safety rails for the 2d20 dice engine migration. The framework validates all table structures, enforces schema constraints, and provides automated checks to prevent migration issues.

## Purpose

The validation framework serves multiple critical purposes:

1. **Data Integrity**: Ensures all 2d20 tables conform to strict structural requirements
2. **Migration Safety**: Provides safety rails that must pass before any dice engine migration
3. **Automated Quality Assurance**: CI/CD integration prevents invalid table structures from being committed
4. **Developer Guidance**: Clear error messages help authors create valid table structures

## Core Validation Rules

### 2d20 Matchup Tables

All 2d20 matchup tables must conform to the following rules:

#### Required Structure
- **Dice sums**: Must contain exactly entries for sums 3-39 (37 entries total)
- **No gaps**: All dice sums from 3-39 must be present
- **No extras**: Only dice sums 3-39 are allowed

#### Entry Format
Each dice sum entry must have:
```typescript
{
  yards: number,           // Integer yardage (positive or negative)
  clock: '10' | '20' | '30', // Clock stoppage in seconds
  tags?: string[],         // Optional descriptive tags
  turnover?: {             // Optional turnover information
    type: 'INT' | 'FUMBLE',
    return_yards?: number, // Optional return yardage
    return_to?: 'LOS' | 'ENDZONE'
  },
  oob?: boolean            // Optional out-of-bounds flag
}
```

#### Doubles Outcomes
- **Required doubles**: Must define outcomes for dice sums 1 and 20
- **Penalty reference**: Sum 2-19 must reference a valid penalty table

#### Metadata Requirements
```typescript
{
  oob_bias: boolean,           // Out-of-bounds bias flag
  field_pos_clamp: boolean,    // Field position clamping
  risk_profile: 'low' | 'medium' | 'high',
  explosive_start_sum: number  // Between 20-39
}
```

### Penalty Tables

All penalty tables must conform to the following rules:

#### Structure
- **Exactly 10 slots**: Must contain exactly 10 penalty outcomes (for d10 rolls)
- **Required fields**: Each penalty must have:
  - `side`: 'offense' | 'defense'
  - `yards`: integer yardage (positive or negative)
  - `description`: human-readable description

#### Optional Fields
- `auto_first`: boolean (automatic first down)
- `loss_of_down`: boolean (down loss)
- `replay`: boolean (replay previous down)

## Validation Implementation

### Automated Validators

The validation framework includes several automated validators:

#### `MatchupTableValidator.ts`
- Validates 2d20 matchup table structure
- Checks for required dice sums 3-39
- Validates entry format and data types
- Enforces clock value constraints
- Validates doubles outcomes

#### `PenaltyTableValidator.ts`
- Validates penalty table structure
- Enforces exactly 10 slots requirement
- Validates all required and optional fields

### CI Integration

#### Validation Script (`scripts/validate-tables.mjs`)
- Recursively scans `data/` directory for JSON files
- Automatically detects table types (matchup vs penalty)
- Provides detailed error reporting with file paths
- Exits with error code on validation failures

#### CI Pipeline Integration
```bash
npm run validate-tables  # Manual validation
npm run ci              # Includes validation in full CI pipeline
```

### Golden Baseline Tests

#### Deterministic Baseline (`tests/golden/deterministic-baseline.json`)
- Captures current deterministic system outputs with seeded RNG
- Provides regression baseline for system changes
- Generated using seed `12345` for reproducible results

#### Baseline Generation
```bash
npm run validate-baseline  # Generate new baseline
```

## Error Messages

The validation framework provides clear, actionable error messages:

### Common Validation Errors

```
❌ Missing dice sum entries: 15, 27, 33
   → Add missing entries for dice sums 15, 27, and 33

❌ Invalid clock value: 15 (must be '10', '20', or '30')
   → Change clock value to one of: '10', '20', '30'

❌ Penalty table must have exactly 10 slots, found 8
   → Add 2 more penalty outcomes to reach 10 total

❌ Dice sum 25 must have numeric yards
   → Ensure yards field is a number, not a string
```

## Usage Guide

### For Table Authors

1. **Create tables** following the structural requirements above
2. **Run validation** locally: `npm run validate-tables`
3. **Fix any errors** reported by the validator
4. **Commit only when** validation passes

### For CI/CD

The validation framework is automatically integrated into:
- Pull request checks
- Pre-deployment validation
- Release candidate validation

### For Migration Safety

**Important**: The dice engine migration cannot proceed unless:
- All existing tables pass validation ✅
- CI pipeline includes validation step ✅
- Golden baseline tests pass ✅

## Extension Points

### Adding New Validators

To add validation for new table types:

1. Create validator function in `src/data/validators/`
2. Export from validation script
3. Update CI script to include new validator
4. Add documentation to this file

### Custom Validation Rules

The framework is designed to be extensible. Custom validation rules can be added by:
- Extending existing validator functions
- Adding new validation functions
- Modifying the CI validation script

## Troubleshooting

### Common Issues

#### "Missing dice sum entries"
- **Cause**: Table doesn't have all required dice sums 3-39
- **Solution**: Add missing entries or use a different dice system

#### "Invalid clock value"
- **Cause**: Clock value not in allowed set {10,20,30}
- **Solution**: Change to valid clock value

#### "Penalty table must have exactly 10 slots"
- **Cause**: Penalty table has wrong number of outcomes
- **Solution**: Add/remove outcomes to reach exactly 10

### Debug Mode

For detailed debugging, run:
```bash
node scripts/validate-tables.mjs
```

This provides verbose output including:
- Files being validated
- Specific validation errors
- Warning messages

## Migration Checklist

Before proceeding with dice engine migration:

- [ ] All existing tables pass validation
- [ ] CI pipeline includes validation step
- [ ] Golden baseline tests pass
- [ ] Validation documentation is current
- [ ] Team understands validation requirements

## Version History

- **v1.0.0**: Initial validation framework implementation
- **v1.1.0**: Added penalty table validation
- **v1.2.0**: Enhanced error messaging and CI integration