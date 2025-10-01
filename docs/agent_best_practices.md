# Agent Best Practices for Gridiron Strategy Migration

## Overview

This document establishes the foundational standards and methodology for the Gridiron Strategy migration project. It provides comprehensive guidelines for prompt engineering, TypeScript development, testing practices, and migration safety patterns to ensure systematic, reversible, and high-quality migration work.

## Core Principles

### 🎯 Single-Purpose Focus
Each prompt must have a **single, clearly defined objective** with unambiguous success criteria. Complex migrations are broken into focused, sequential steps.

### 🔒 Safety First
All changes must be **reversible and non-destructive**. Migration work includes rollback plans and validation steps to prevent system degradation.

### 📏 Quality Standards
Maintain or exceed existing code quality thresholds. All changes must pass CI validation before integration.

## Prompt Engineering Standards

### Structure Requirements
**Every prompt must include:**

```markdown
# XX_title_case_action.md — Clear, Actionable Title

## Title & Goal
Single sentence describing the specific deliverable and success criteria.

## Context
**What exists:** Current state, dependencies, and constraints.
**What must change:** Specific modifications required.

## Inputs
Explicit list of files, data, or context required for the task.

## Outputs
Specific deliverables with clear acceptance criteria.
```

### Prompt Categories

#### 🏗️ **Foundation Prompts** (00-04)
Establish core systems and standards. Must be completed before dependent work begins.

#### 🔧 **Feature Prompts** (05-09)
Implement specific functionality. Depend on foundation prompts.

#### 🧪 **Validation Prompts** (10-14)
Testing, balancing, and quality assurance. Depend on feature implementation.

#### 📚 **Documentation Prompts** (15+)
Update documentation and migration status. Final step in each phase.

### Prompt Dependencies
Prompts reference prerequisites explicitly:

```markdown
## Prerequisites
- [x] 00_agent_best_practices.md (This document)
- [x] 01_validate_repo.md (Repository validation)
- [ ] 03_resolver_engine.md (Core engine implementation)
```

## TypeScript Development Standards

### Strict Type Safety
Building on existing `tsconfig.json` strict settings:

```typescript
// ✅ DO: Use discriminated unions for type safety
type PlayResult =
  | { type: 'success'; yards: number; firstDown: boolean }
  | { type: 'turnover'; reason: 'interception' | 'fumble' }
  | { type: 'penalty'; side: 'offense' | 'defense'; yards: number }

// ❌ AVOID: Any types or unsafe casts
function processPlay(result: any): void { // Never use any
  const yards = result.yards as number; // Avoid unsafe casts
}
```

### Module Organization
Respect existing facade patterns:

```
src/
├── rules/        # Pure game logic, no side effects
│   ├── dice/     # Dice resolution (2d20 system)
│   ├── plays/    # Play execution logic
│   └── timing/   # Clock and quarter management
├── flow/         # Game state management and transitions
├── ai/           # AI decision making and strategy
├── sim/          # Simulation engine and RNG
├── data/         # Schema definitions and data loading
├── ui/           # User interface components
└── utils/        # Shared utilities and helpers
```

### Import Hygiene
Follow existing ESLint rules:

```typescript
// ✅ CORRECT: Proper import ordering and hygiene
import { z } from 'zod';
import type { GameState } from '../domain/GameState';
import { resolveDiceOutcome } from '../rules/dice/resolver';
import { updateGameState } from '../flow/state-manager';

// ❌ INCORRECT: Wrong order, unused imports, no blank line
import { GameState } from '../domain/GameState';
import { resolveDiceOutcome } from '../rules/dice/resolver';
import { z } from 'zod';
import { updateGameState } from '../flow/state-manager';
import { unusedFunction } from '../utils/helpers'; // Unused import
```

### Determinism Requirements
**Critical for game consistency:**

```typescript
// ✅ DO: Use injected RNG for reproducible results
export function resolvePlay(
  table: MatchupTable,
  rng: RNG
): PlayResult {
  const roll = rng.roll2d20();
  return lookupOutcome(table, roll);
}

// ❌ AVOID: Non-deterministic behavior
export function resolvePlay(table: MatchupTable): PlayResult {
  const roll = Math.floor(Math.random() * 40) + 2; // Never use Math.random()
  return lookupOutcome(table, roll);
}
```

## Testing Standards

### Coverage Requirements
Maintain existing Vitest thresholds:
- **Lines**: ≥ 70%
- **Functions**: ≥ 70%
- **Statements**: ≥ 70%
- **Branches**: ≥ 60%

Coverage focuses on core modules:
```typescript
// vitest.config.ts
coverage: {
  include: [
    'src/rules/**/*.ts',
    'src/flow/**/*.ts',
    'src/ai/**/*.ts',
    'src/sim/**/*.ts',
    'src/data/schemas/**/*.ts',
    'src/data/loaders/**/*.ts'
  ],
  exclude: ['src/ui/**', 'src/index.ts']
}
```

### Test Categories

#### 🧪 **Unit Tests**
Test individual functions with mocked dependencies:

```typescript
describe('DiceResolver', () => {
  const mockRNG = { roll2d20: () => 25 };

  it('resolves normal outcomes correctly', () => {
    const result = resolveDiceOutcome(mockTable, mockRNG);
    expect(result.yards).toBe(7);
    expect(result.clock).toBe('20');
  });

  it('handles doubles correctly', () => {
    const doublesRNG = { roll2d20: () => 40 }; // 20+20
    const result = resolveDiceOutcome(mockTable, doublesRNG);
    expect(result).toEqual({ result: 'OFF_TD' });
  });
});
```

#### 🔗 **Integration Tests**
Test module interactions with real dependencies:

```typescript
describe('GameFlow Integration', () => {
  it('completes full drive correctly', async () => {
    const game = createGame();
    const events: GameEvent[] = [];

    game.on('playCompleted', (event) => events.push(event));

    await game.executeDrive(mockOffense, mockDefense);

    expect(events).toHaveLength(12); // Expected play count
    expect(game.currentDown).toBe(1); // Drive completed
  });
});
```

#### 🏆 **Golden Tests**
Compare against established baselines:

```typescript
describe('Play Resolution Golden Tests', () => {
  it('matches expected outcomes for all dice rolls', () => {
    const results = new Map<number, PlayResult>();

    for (let roll = 3; roll <= 39; roll++) {
      const rng = { roll2d20: () => roll };
      results.set(roll, resolveDiceOutcome(baseTable, rng));
    }

    expect(results).toMatchBaseline('dice-resolution-baseline.json');
  });
});
```

### Test Data Management
```typescript
// ✅ DO: Use deterministic test data factories
export const createTestGame = (overrides: Partial<GameState> = {}): GameState => ({
  quarter: 1,
  timeRemaining: '15:00',
  down: 1,
  distance: 10,
  fieldPosition: 20,
  score: { home: 0, away: 0 },
  ...overrides
});

// ❌ AVOID: Hardcoded test data
const game = {
  quarter: 1, // Magic number
  timeRemaining: '15:00',
  down: 1,
  distance: 10,
  fieldPosition: 20,
  score: { home: 0, away: 0 }
};
```

## Migration Safety Patterns

### Rollback Strategy
Every change includes a documented rollback plan:

```markdown
## Rollback Plan
1. **Revert commit**: `git revert <commit-hash>`
2. **Restore backup**: Copy `/backups/pre-migration-state.json` to restore data
3. **Feature flag**: Disable new engine via `window.GS.enableNewResolver = false`
4. **Validation**: Run `npm run test:integration:full` to confirm system integrity
```

### Non-Destructive Changes
Structure changes to minimize risk:

```typescript
// ✅ DO: Add new functionality alongside existing
export class NewResolver {
  static resolve(play: Play): PlayResult {
    // New implementation
  }
}

export class LegacyResolver {
  static resolve(play: Play): PlayResult {
    // Existing implementation unchanged
  }
}

// ❌ AVOID: Modify existing functions directly
// export function resolvePlay(play: Play): PlayResult { // Don't modify
```

### Feature Flags
Use configuration switches for safe rollouts:

```typescript
// src/config/featureFlags.ts
export const FeatureFlags = {
  newResolver: process.env.ENABLE_NEW_RESOLVER === 'true',
  experimentalAI: window.location.search.includes('experimental=true'),
  debugMode: process.env.NODE_ENV === 'development'
} as const;

// Usage in game logic
export function resolvePlay(table: MatchupTable, rng: RNG): PlayResult {
  if (FeatureFlags.newResolver) {
    return NewResolver.resolve(table, rng);
  }
  return LegacyResolver.resolve(table, rng);
}
```

### Validation Steps
Every change includes specific validation criteria:

```typescript
// ✅ DO: Implement comprehensive validation
export const validateMigration = async (): Promise<ValidationResult> => {
  const results: ValidationResult = {
    unitTests: await runUnitTests(),
    integrationTests: await runIntegrationTests(),
    performanceTests: await runPerformanceTests(),
    schemaValidation: validateAllSchemas(),
    goldenTestComparison: compareAgainstBaselines()
  };

  return results;
};
```

## Workflow Methodology

### ReAct Loop Pattern
Structure work using the ReAct (Reasoning + Action) pattern:

1. **Reason**: Analyze requirements and plan approach
2. **Act**: Implement changes in small, focused steps
3. **Observe**: Run tests and validate outcomes
4. **Reflect**: Adjust approach based on results

```markdown
## Implementation Plan
1. **Analysis**: Review existing code and requirements
2. **Design**: Plan the implementation approach
3. **Implementation**: Small, incremental changes
4. **Testing**: Validate each change thoroughly
5. **Integration**: Ensure compatibility with existing systems
```

### Conventional Commits
Use structured commit messages:

```bash
# Feature implementation
feat(rules): implement 2d20 dice resolver with turnover handling

# Bug fixes
fix(ai): correct PAT decision logic for two-point conversions

# Documentation updates
docs(gdd): update migration status and next steps

# Refactoring
refactor(flow): extract game state management into separate module

# Testing improvements
test(rules): add comprehensive dice resolution test coverage
```

### PR Structure
Every PR includes comprehensive documentation:

```markdown
## Summary
Implement new dice resolution engine with improved turnover handling.

## Changes Made
- `src/rules/dice/resolver.ts`: New resolver implementation
- `src/data/schemas/MatchupTable.ts`: Updated schema validation
- `tests/rules/dice/`: Comprehensive test coverage

## Risk Assessment
- **Low Risk**: Changes are feature-flagged and non-breaking
- **Rollback Plan**: Feature flag can be disabled, or revert commit
- **Testing**: All existing tests pass, new tests added

## Test Plan
- [x] Unit tests for new resolver logic
- [x] Integration tests for game flow compatibility
- [x] Golden tests against established baselines
- [x] Performance tests to ensure no regression

## Screenshots/Logs
[Attach relevant test output, performance metrics, or UI changes]
```

## Quality Assurance

### Pre-Commit Checklist
Before every commit, run:

```bash
# Full validation suite
npm run ci

# This runs:
# - TypeScript type checking
# - ESLint with zero warnings allowed
# - Unit test coverage validation
# - Integration tests with baseline comparison
# - Rules coverage validation
```

### Continuous Integration
The CI pipeline validates every change:

```json
{
  "scripts": {
    "ci": "npm run typecheck && npm run lint -- --max-warnings=0 && npm run test:cov && npm run test:integration:ci && npm run check:rules-cov"
  }
}
```

### Code Review Standards
Every change undergoes review with specific criteria:

- [ ] **Functionality**: Meets requirements and acceptance criteria
- [ ] **Safety**: Includes rollback plan and is non-destructive
- [ ] **Testing**: Adequate test coverage and passes all tests
- [ ] **Performance**: No performance regression
- [ ] **Documentation**: Updated docs and migration status
- [ ] **Standards**: Follows all coding standards and patterns

## Migration Project Structure

### Phase-Based Approach
The migration follows structured phases:

1. **Foundation** (Prompts 00-04): Establish standards and core systems
2. **Implementation** (Prompts 05-09): Build new functionality
3. **Validation** (Prompts 10-14): Testing and quality assurance
4. **Documentation** (Prompts 15+): Final documentation and handoff

### Dependency Management
Clear prerequisite chains ensure safe progression:

```
00_agent_best_practices.md (Foundation)
├── 01_validate_repo.md (Validation)
├── 02_schema_tables.md (Data)
└── 03_resolver_engine.md (Core Engine)
    ├── 04_seed_tables_minpack.md (Data)
    ├── 05_ui_minimal_cards.md (UI)
    └── 06_ai_policy_update.md (AI)
        └── [Continue pattern...]
```

## Success Metrics

### Quality Gates
- **Zero Tolerance**: No linting errors or warnings
- **Coverage Maintenance**: No reduction in test coverage
- **Performance Baseline**: No performance regression
- **Integration Health**: All integration tests pass
- **Golden Test Stability**: Baselines only change intentionally

### Migration Progress Tracking
Each prompt tracks completion status:

```markdown
## Migration Status
- [x] **00_agent_best_practices.md**: Standards document created
- [x] **01_validate_repo.md**: Repository validation completed
- [ ] **02_schema_tables.md**: Schema updates in progress
- [ ] **03_resolver_engine.md**: Core engine implementation pending
```

This document serves as the foundation for all migration work. Every subsequent prompt must reference these standards and contribute to the systematic, safe migration of the Gridiron Strategy system.
```