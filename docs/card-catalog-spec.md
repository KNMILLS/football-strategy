# Card Catalog Specification

## Overview

The Gridiron Strategy card catalog system provides a comprehensive collection of 100 offensive cards across five playbooks and a universal 10-card defensive deck. This system enables tactical decision-making through simultaneous card selection and dice resolution.

## Structure

### Offensive Cards (100 total)

**Five Playbooks × 20 Cards Each:**
- **West Coast** - Short-to-intermediate passing game with timing routes
- **Spread** - Horizontal stretching with RPO and mesh concepts
- **Air Raid** - Vertical passing game with four-receiver sets
- **Smashmouth** - Power running with play-action passing
- **Wide Zone** - Zone running schemes with motion and deception

### Defensive Cards (10 total)

**Universal Defensive Deck:**
- Goal Line, All-Out Blitz, Inside Blitz, Outside Blitz
- Cover 1, Cover 2, Cover 3, Cover 4, Cover 6, Prevent

## Card Metadata

### PlaybookCardMetadata Interface

```typescript
interface PlaybookCardMetadata {
  id: string;                    // Unique identifier (e.g., "wc-quick-slant")
  playbook: PlaybookName;        // Which playbook this card belongs to
  label: string;                 // Display name (e.g., "Quick Slant")
  type: CardType;               // "run" | "pass" | "punt" | "field-goal"
  description: string;           // Detailed description of the play
  riskLevel: RiskLevel;         // "low" | "medium" | "high" | "very-high"
  perimeterBias: PerimeterBias; // "inside" | "balanced" | "outside"
  tags: string[];               // Array of descriptive tags
  averageYards?: number;        // Expected yards gained (optional)
  completionRate?: number;      // Pass completion rate 0-1 (optional)
  touchdownRate?: number;       // TD probability 0-1 (optional)
  turnoverRisk?: number;        // Turnover probability 0-1 (optional)
}
```

### DefensiveCardMetadata Interface

```typescript
interface DefensiveCardMetadata {
  id: string;                          // Unique identifier
  label: DefensivePlay;               // Defensive play name
  description: string;                 // Detailed description
  coverageType: "man" | "zone" | "blitz" | "prevent";
  aggressionLevel: "conservative" | "balanced" | "aggressive";
  tags: string[];                      // Array of descriptive tags
}
```

## Card Archetypes by Playbook

### West Coast (Timing & Possession)
- **Focus**: Short passes, screens, play-action, timing routes
- **Risk Profile**: Low-medium risk, high completion rates
- **Key Concepts**: Slant routes, screens, dig routes, flood concepts
- **Perimeter Bias**: Balanced with inside zone running

### Spread (Horizontal Stretch)
- **Focus**: Spread formations, RPO, mesh concepts, underneath routes
- **Risk Profile**: Medium-high risk, versatile play calling
- **Key Concepts**: Mesh, RPO bubble, levels, spot concepts
- **Perimeter Bias**: Outside with zone reads and stretch plays

### Air Raid (Vertical Attack)
- **Focus**: Four verticals, deep shots, layered routes
- **Risk Profile**: Very high risk, boom-or-bust potential
- **Key Concepts**: Four verts, smash, post-corner, flood concepts
- **Perimeter Bias**: Balanced with emphasis on vertical stems

### Smashmouth (Power Running)
- **Focus**: Power running, play-action, physical matchups
- **Risk Profile**: Medium risk, consistent yardage
- **Key Concepts**: Power O, counter, trap, bootleg plays
- **Perimeter Bias**: Inside with gap schemes and lead blocking

### Wide Zone (Zone Running)
- **Focus**: Zone blocking, motion, deception, cutback lanes
- **Risk Profile**: Medium risk, patient running style
- **Key Concepts**: Wide zone, stretch, counter, RPO options
- **Perimeter Bias**: Outside with emphasis on perimeter plays

## Risk Level Guidelines

### Low Risk (Conservative Plays)
- **Characteristics**: High completion rates (>80%), low turnover risk (<10%)
- **Examples**: Screens, checkdowns, inside zone runs
- **Use Cases**: Clock management, short yardage, comeback situations

### Medium Risk (Balanced Plays)
- **Characteristics**: Moderate completion rates (60-80%), balanced risk/reward
- **Examples**: Intermediate routes, zone runs, play-action
- **Use Cases**: Standard down-and-distance, field position management

### High Risk (Aggressive Plays)
- **Characteristics**: Lower completion rates (40-60%), higher TD potential
- **Examples**: Deep passes, vertical routes, misdirection runs
- **Use Cases**: Long yardage, scoring opportunities, aggressive situations

### Very High Risk (Gambling Plays)
- **Characteristics**: Low completion rates (<40%), very high TD potential
- **Examples**: Four verticals, post-corner, deep shots
- **Use Cases**: Desperation situations, trick plays, maximum reward scenarios

## Perimeter Bias Guidelines

### Inside Bias
- **Focus**: Between the tackles, seam routes, interior running
- **Advantages**: Consistent yardage, matchup exploitation
- **Disadvantages**: Predictable, vulnerable to blitz

### Balanced Bias
- **Focus**: Mix of inside and outside concepts
- **Advantages**: Versatile, hard to defend
- **Disadvantages**: Requires precise execution

### Outside Bias
- **Focus**: Perimeter plays, sideline routes, edge running
- **Advantages**: Field stretching, big play potential
- **Disadvantages**: Weather dependent, turnover prone

## Defensive Coverage Types

### Man Coverage
- **Characteristics**: Defender follows specific receiver
- **Aggression**: High pressure potential
- **Use Cases**: Press coverage, blitz packages

### Zone Coverage
- **Characteristics**: Defenders responsible for areas
- **Aggression**: Conservative to balanced
- **Use Cases**: Prevent defense, underneath protection

### Blitz
- **Characteristics**: Extra rushers, maximum pressure
- **Aggression**: Very aggressive
- **Use Cases**: Passing situations, comeback prevention

### Prevent
- **Characteristics**: Soft coverage, prevent big plays
- **Aggression**: Conservative
- **Use Cases**: Late game, lead protection

## Authoring Guidelines

### Card ID Format
- **Pattern**: `{playbook-abbrev}-{play-name}`
- **Examples**: `wc-quick-slant`, `ar-four-verts`, `sm-power-o`
- **Constraints**: Lowercase, hyphen-separated, no spaces

### Statistical Data
- **Completion Rates**: 0.0-1.0 (pass plays only)
- **Average Yards**: Realistic ranges (2-25 for most plays)
- **Touchdown Rates**: 0.0-0.25 (higher for deep passes)
- **Turnover Risk**: 0.0-0.35 (higher for risky plays)

### Tag System
- **Purpose**: Enable filtering and AI decision-making
- **Categories**:
  - **Play Type**: `screen`, `vertical`, `zone`, `power`
  - **Route Concept**: `slant`, `post`, `corner`, `flood`
  - **Situation**: `short-yardage`, `deep-shot`, `checkdown`
  - **Style**: `aggressive`, `conservative`, `versatile`

### Balance Considerations
- **Distribution**: Each playbook should have balanced run/pass ratios
- **Risk Curve**: Appropriate risk/reward for each playbook archetype
- **Situational Fit**: Cards should serve distinct tactical purposes

## Integration Points

### UI Systems
- **Card Selection**: Display cards with metadata for informed choices
- **Visual Indicators**: Show risk levels, perimeter bias, statistical data
- **Filtering**: Enable playbook, type, and criteria-based filtering

### AI Systems
- **Play Selection**: Use risk profiles and game situation for decisions
- **Penalty Choices**: Factor in aggression levels and coverage types
- **Tendency Tracking**: Monitor card usage patterns across playbooks

### Dice Resolution
- **Outcome Tables**: Cards influence which matchup table is used
- **Risk Assessment**: Higher risk cards may have different outcome distributions
- **Perimeter Awareness**: Bias affects out-of-bounds and field position mechanics

## Validation Rules

### Structural Validation
- **Card Count**: Exactly 20 cards per offensive playbook
- **Defensive Count**: Exactly 10 defensive cards
- **ID Uniqueness**: All card IDs must be unique across the entire catalog
- **Required Fields**: All metadata fields must be present and valid

### Balance Validation
- **Risk Distribution**: Appropriate spread of risk levels per playbook
- **Type Balance**: Reasonable run/pass ratios for each playbook
- **Statistical Consistency**: Realistic statistical ranges and relationships

## File Organization

```
data/cards/
├── playbooks.json          # Complete card catalog
src/data/cards/
├── CardMetadata.ts         # TypeScript interfaces
└── CardCatalog.ts          # Loader and accessor class
tests/data/cards/
├── CardMetadata.test.ts    # Type validation tests
└── CardCatalog.test.ts     # Integration tests
```

## Future Enhancements

### Advanced Metadata
- **Personnel Requirements**: Linemen, receivers, running backs needed
- **Formation Dependencies**: Shotgun, under center, motion requirements
- **Weather Impact**: Performance modifiers for wind, rain, cold
- **Field Position Effects**: Different effectiveness based on field location

### Dynamic Content
- **Situational Modifiers**: Performance changes based on score, time, down
- **Opponent Adjustments**: Effectiveness vs. specific defensive schemes
- **Player Abilities**: Integration with player cards and abilities

This card catalog system provides the foundation for tactical football gameplay while maintaining the strategic depth that makes Gridiron Strategy engaging for both casual and competitive players.
