# Table Authoring Guide

## Overview

The Table Authoring Tools provide a comprehensive workflow for creating and managing dice tables for the Gridiron Strategy game. These tools help authors create GDD-compliant tables with proper validation, balance analysis, and bulk import capabilities.

## Quick Start

### Creating a New Table

Use the table scaffolder to generate a new table with proper structure:

```bash
# Create a basic table
node scripts/scaffold-table.mjs "West Coast" "Blitz"

# Create with specific template and options
node scripts/scaffold-table.mjs "Air Raid" "Coverage" --template aggressive --risk high --explosive 20

# Preview without creating file
node scripts/scaffold-table.mjs "Smashmouth" "Rush" --dry-run --preview-chart
```

### Importing from CSV

Import tables from spreadsheet data:

```bash
# Import from CSV file
node scripts/import-csv-tables.mjs playbook_data.csv

# Validate only (don't create files)
node scripts/import-csv-tables.mjs data.csv --validate-only --preview-chart

# Import to specific directory
node scripts/import-csv-tables.mjs sheets_export.csv --output-dir custom_tables/
```

### Analyzing Distributions

Preview and analyze table balance:

```bash
# Analyze a table's distribution
node scripts/preview-distribution.mjs data/west_coast_blitz.json

# Compare two tables
node scripts/preview-distribution.mjs table1.json --compare table2.json

# Show only balance analysis
node scripts/preview-distribution.mjs my_table.json --balance-only
```

## Table Structure

### Required Elements

All dice tables must include:

1. **Entries for sums 3-39**: Each sum represents a dice roll outcome
2. **Doubles outcomes**: Special handling for 1-1, 20-20, and 2-19 rolls
3. **Metadata**: Balance settings and risk profile

### Entry Structure

Each dice sum entry contains:

```typescript
{
  yards: number,        // Yardage gained/lost
  clock: '10' | '20' | '30',  // Clock runoff in seconds
  tags?: string[],      // Optional descriptive tags
  turnover?: {          // Optional turnover outcome
    type: 'INT' | 'FUM',
    return_yards: number,
    return_to: 'LOS'
  },
  oob?: boolean         // Out of bounds flag
}
```

### Metadata

```typescript
{
  oob_bias: boolean,           // Enable out-of-bounds bias
  field_pos_clamp: boolean,    // Clamp yards to field position
  risk_profile: 'low' | 'medium' | 'high',
  explosive_start_sum: number  // Sum where explosive plays begin
}
```

## Authoring Workflow

### 1. Scaffold Base Table

Start with a template that matches your desired play style:

- **Balanced**: Moderate yardage, standard risk (default)
- **Conservative**: Lower yardage, turnover-focused
- **Aggressive**: Higher yardage, explosive plays

### 2. Customize Yardage Values

Adjust yardage for each sum to match your strategic vision:

- **Low sums (3-5)**: Consider turnovers for strategic depth
- **Mid sums (10-20)**: Standard running/passing plays
- **High sums (25-39)**: Explosive plays and big gains

### 3. Balance Clock Management

Distribute clock runoff to create tactical decisions:

- **10 seconds**: Quick plays, maintain tempo
- **20 seconds**: Standard play duration
- **30 seconds**: Clock-killing plays

### 4. Validate and Preview

Use the distribution preview to ensure balance:

```bash
node scripts/preview-distribution.mjs your_table.json --validate
```

### 5. Iterate and Refine

Make adjustments based on:
- Balance analysis feedback
- Playbook identity matching
- Strategic requirements

## CSV Import Format

### Table Metadata Row

```csv
table_name,off_card,def_card,dice_sum,yards,clock,meta_risk_profile
west_coast_blitz,West Coast,Blitz,,medium
```

### Entry Rows

```csv
table_name,off_card,def_card,dice_sum,yards,clock,tags,turnover_type,turnover_return_yards
west_coast_blitz,West Coast,Blitz,3,0,20,turnover,FUM,0
west_coast_blitz,West Coast,Blitz,4,2,20,,,
west_coast_blitz,West Coast,Blitz,5,5,20,,,
```

### Bulk Import Example

```csv
table_name,off_card,def_card,dice_sum,yards,clock,meta_risk_profile
air_raid_coverage,Air Raid,Coverage,,high
air_raid_coverage,Air Raid,Coverage,3,0,20,FUM,5
air_raid_coverage,Air Raid,Coverage,4,1,20,,
air_raid_coverage,Air Raid,Coverage,5,3,20,,
smashmouth_blitz,Smashmouth,Blitz,,low
smashmouth_blitz,Smashmouth,Blitz,3,0,30,FUM,0
smashmouth_blitz,Smashmouth,Blitz,4,1,30,,
```

## Balance Guidelines

### Explosive Play Rate

Target 15-25% of completions for 20+ yard gains:

- **Air Raid**: 20-30% (high volume passing)
- **Smashmouth**: 8-15% (ground-focused)
- **West Coast**: 12-20% (rhythm passing)

### Turnover Distribution

Include turnovers in the 3-5 sum range:

- **Conservative**: Higher turnover rate in low sums
- **Aggressive**: Lower turnover rate, more explosive plays
- **Balanced**: Moderate turnover rate

### Clock Management

Balance clock runoff across game situations:

- **Two-minute drill**: Favor 10-second plays
- **Clock killing**: Favor 30-second plays
- **Normal**: Balanced distribution

## Validation and Quality Assurance

### Automated Checks

The tools provide several validation layers:

1. **Schema validation**: Ensures proper table structure
2. **GDD compliance**: Turnover band and doubles requirements
3. **Balance analysis**: Explosive rate and distribution checks
4. **Structural consistency**: Missing entries and pattern detection

### Manual Review

Before finalizing tables:

1. **Playtest the table**: Test in actual game scenarios
2. **Review distributions**: Check yardage curves make sense
3. **Validate edge cases**: Ensure doubles and special situations work
4. **Cross-reference**: Compare with similar existing tables

## Troubleshooting

### Common Issues

**"Missing turnover band entries"**
- Add entries for sums 3-5 with turnover outcomes
- Consider strategic implications of turnover placement

**"High explosive rate"**
- Reduce yardage for high-sum outcomes
- Adjust explosive_start_sum in metadata

**"Unbalanced clock distribution"**
- Ensure mix of 10/20/30 second plays
- Consider game situation requirements

**"Schema validation failed"**
- Check all required fields are present
- Verify data types (yards as number, clock as string)
- Ensure doubles entries exist

### Performance Optimization

For large table sets:

```bash
# Validate multiple tables efficiently
node scripts/import-csv-tables.mjs large_dataset.csv --validate-only

# Use dry-run for preview
node scripts/scaffold-table.mjs "Complex Offense" "Complex Defense" --dry-run
```

## Advanced Usage

### Programmatic API

Use the TypeScript utilities directly:

```typescript
import {
  scaffoldMatchupTable,
  parseCsvContent,
  analyzeDistribution,
  validateTableWithFeedback
} from './src/tools/table-authoring';

// Create table programmatically
const table = scaffoldMatchupTable({
  offCard: 'Custom Offense',
  defCard: 'Custom Defense',
  template: 'aggressive'
});

// Analyze balance
const analysis = analyzeDistribution(table);
console.log(`Explosive rate: ${analysis.statistics.explosiveRate}%`);

// Validate thoroughly
const validation = validateTableWithFeedback(table);
if (validation.isValid) {
  console.log('✅ Table is ready for use!');
}
```

### Custom Templates

Create custom templates for specific playbooks:

```typescript
const customTemplate = {
  oobBias: true,
  fieldPosClamp: false,
  riskProfile: 'high' as const,
  explosiveStartSum: 18,
  avgYards: 9,
  clockDistribution: { '10': 20, '20': 30, '30': 50 }
};
```

## Integration with Existing Workflow

The authoring tools integrate with the existing Gridiron development workflow:

1. **Development**: Use scaffolder for new tables
2. **Testing**: Validate with preview tools
3. **CI/CD**: Automated validation in build process
4. **Documentation**: Update table metadata and balance notes

## Best Practices

### Table Design

1. **Start simple**: Begin with balanced template, then customize
2. **Test iteratively**: Use preview tools frequently during development
3. **Document decisions**: Add comments explaining yardage choices
4. **Validate thoroughly**: Use all validation modes before finalizing

### Performance

1. **Batch operations**: Use CSV import for multiple tables
2. **Preview first**: Use dry-run and validate-only modes
3. **Cache analysis**: Save preview results for comparison
4. **Monitor balance**: Track how changes affect overall game balance

### Collaboration

1. **Share CSV files**: Use standardized CSV format for team collaboration
2. **Document templates**: Create shared templates for consistent playbooks
3. **Review process**: Use validation feedback for code review
4. **Version control**: Track table evolution with git

## Support and Resources

- **API Documentation**: See TypeScript definitions in `src/tools/table-authoring/`
- **Test Examples**: Review test files in `tests/tools/table-authoring/`
- **CLI Help**: Use `--help` flag with any script
- **GDD Reference**: Consult Game Design Document for balance requirements
