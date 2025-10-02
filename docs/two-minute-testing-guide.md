# Two-Minute Drill Testing Guide

## Overview

The Two-Minute Drill Test Suite provides comprehensive validation for late-game scenarios in football simulation. This suite tests critical edge cases involving clock management, desperation plays, penalty decisions, and sideline management under extreme time pressure.

## Test Categories

### 1. Clock Edge Cases (`ClockEdgeCases.ts`)

Tests scenarios where time expiration occurs during play resolution:

- **Time Expiration During Play**: Clock hits 0 during incomplete pass, field goal attempt, or touchdown play
- **Two-Minute Warning Edge Cases**: Exact timing of the two-minute warning trigger
- **Quarter End Edge Cases**: Time expiration at end of quarter or half
- **Game End Edge Cases**: Time expiration at end of game or overtime

**Key Scenarios:**
- Incomplete pass with 3 seconds remaining
- Field goal attempt with 2 seconds remaining
- Touchdown catch with 1 second remaining
- Exact two-minute warning at 2:00 remaining

### 2. Desperation Plays (`DesperationPlays.ts`)

Tests Hail Mary attempts, lateral plays, and other last-second heroics:

- **Hail Mary Attempts**: Long passes in final seconds for touchdown
- **Lateral Play Attempts**: Pitch and run sequences for dramatic finishes
- **Spike and Kneel Scenarios**: Clock management with spikes and kneel downs
- **Onside Kick Recovery**: Desperate kickoff recovery attempts

**Key Scenarios:**
- Successful Hail Mary touchdown from midfield
- Multiple lateral sequence for game-winning score
- Quarterback spike to preserve time for final play
- Victory kneel down to run out clock

### 3. Penalty Pressure (`PenaltyPressure.ts`)

Tests accept/decline decisions under time pressure:

- **Accept vs Decline Under Time Pressure**: Strategic penalty decisions
- **Penalty on Scoring Plays**: Penalties during game-winning/game-tying plays
- **Pre-Snap vs Post-Play Penalties**: Timing of penalty calls
- **Timeout vs Penalty Decisions**: Choosing between timeouts and penalties

**Key Scenarios:**
- Decline defensive penalty that gives automatic first down
- Accept offensive penalty that stops clock
- Penalty on game-winning touchdown attempt
- Choose timeout over accepting minor penalty

### 4. Sideline Management (`SidelineManagement.ts`)

Tests timeout usage, replay challenges, and strategic decisions:

- **Timeout Usage Strategy**: When and how to use timeouts
- **Replay Challenge Decisions**: When to challenge plays
- **Two-Minute Warning Management**: Handling the automatic stoppage
- **End-of-Game Management**: Final seconds strategy

**Key Scenarios:**
- Strategic timeout to preserve time for game-winning drive
- Challenge critical play when reviewable
- Decline challenge when time is too critical
- Manage final seconds when leading vs trailing

## Running the Test Suite

### Basic Execution

```bash
# Run all two-minute drill scenarios
node scripts/run-two-minute-suite.mjs

# Run with verbose output
node scripts/run-two-minute-suite.mjs --verbose

# Run specific category only
node scripts/run-two-minute-suite.mjs --filter="Clock Edge Cases"
```

### Test Output

```
🏈 Two-Minute Drill Test Suite v1.0.0
============================================================

📂 Clock Edge Cases
----------------------------------------
✅ Incomplete Pass Time Expiration (45.2ms)
✅ Field Goal Time Expiration (38.7ms)
✅ Touchdown Time Expiration (42.1ms)

📂 Desperation Plays
----------------------------------------
✅ Successful Hail Mary TD (52.3ms)
✅ Successful Lateral TD (47.8ms)
✅ QB Spike to Stop Clock (41.5ms)

📂 Penalty Pressure
----------------------------------------
✅ Decline Defensive Penalty for First Down (39.4ms)
✅ Accept Clock-Stopping Penalty (44.6ms)

📂 Sideline Management
----------------------------------------
✅ Strategic Timeout Usage (48.2ms)
✅ Critical Challenge Decision (43.9ms)

============================================================
📊 TEST SUMMARY
============================================================
Total Scenarios: 8
✅ Passed: 8
❌ Failed: 0
⏭️  Skipped: 0
⏱️  Duration: 450.2ms
📈 Success Rate: 100.0%
⚡ Average Duration: 44.4ms
🐌 Slow Scenarios: 0
============================================================

🎉 All two-minute drill scenarios passed!
```

## Scenario Framework

### Creating Custom Scenarios

The framework provides a flexible system for defining scenarios:

```typescript
import { ScenarioFactory, TwoMinuteScenario } from './ScenarioFramework';

const customScenario = ScenarioFactory.createClockEdgeCase({
  name: 'Custom Clock Scenario',
  description: 'My custom scenario description',
  initialState: {
    seed: 12345,
    quarter: 4,
    clock: 10,
    down: 4,
    toGo: 5,
    ballOn: 30,
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 17, ai: 21 }
  },
  expectedOutcomes: [
    {
      description: 'Clock should expire',
      validator: (result) => result.gameState.clock === 0,
      errorMessage: 'Clock should be 0 after expiration'
    }
  ]
});

const result = await customScenario.execute();
```

### Expected Outcomes

Each scenario defines expectations that must be met:

```typescript
expectedOutcomes: [
  {
    description: 'Game should end when time expires',
    validator: (result) => result.gameState.gameOver === true,
    errorMessage: 'Game should be over when time expires'
  },
  {
    description: 'Touchdown should count if scored before expiration',
    validator: (result) => result.gameState.awaitingPAT === true,
    errorMessage: 'Touchdown should count if scored before time expires'
  }
]
```

## Integration with CI/CD

### Automated Testing

The two-minute drill suite is designed for automated execution:

```bash
# In CI pipeline
npm run test:two-minute

# With coverage reporting
npm run test:two-minute -- --coverage

# Performance regression testing
npm run test:two-minute -- --performance-baseline
```

### Performance Thresholds

- **Maximum per scenario**: 500ms
- **Average across suite**: < 100ms
- **Total suite duration**: < 5 seconds

## Debugging Failed Scenarios

### Verbose Mode

```bash
node scripts/run-two-minute-suite.mjs --verbose --filter="Failed Scenario Name"
```

### Manual Debugging

```typescript
import { ScenarioFactory } from './ScenarioFramework';

// Debug specific scenario
const scenario = ScenarioFactory.createClockEdgeCase({...});
const result = await scenario.execute();

console.log('Events:', result.events);
console.log('Errors:', result.errors);
console.log('Final State:', result.gameState);
```

## Best Practices

### Scenario Design

1. **Deterministic Setup**: Use fixed seeds for reproducible results
2. **Clear Expectations**: Define specific, testable outcomes
3. **Realistic Situations**: Base scenarios on actual NFL game situations
4. **Edge Case Coverage**: Test boundary conditions (0 seconds, exact timing)

### Performance Optimization

1. **Minimal Operations**: Keep scenario execution lightweight
2. **Efficient Validation**: Use simple validator functions
3. **Batch Execution**: Run scenarios in parallel where possible
4. **Memory Management**: Clean up resources after each scenario

### Maintenance

1. **Regular Updates**: Add new scenarios for rule changes
2. **Regression Testing**: Ensure existing scenarios remain valid
3. **Documentation**: Keep scenario descriptions current
4. **Code Reviews**: Validate new scenarios thoroughly

## Troubleshooting

### Common Issues

**Scenario Timeout**
- Reduce scenario complexity
- Check for infinite loops in execution logic
- Increase timeout threshold if needed

**Non-Deterministic Results**
- Verify all random elements use fixed seeds
- Check for external dependencies affecting timing
- Ensure consistent initial state

**Performance Degradation**
- Profile slow scenarios to identify bottlenecks
- Optimize validator functions
- Consider scenario batching

### Getting Help

1. Check the [project documentation](../../README.md)
2. Review existing scenario implementations
3. Consult the [agent best practices](../../docs/agent_best_practices.md)
4. Open an issue with detailed scenario logs

## Migration Guide

### From Manual Testing to Automated Suite

1. **Identify Critical Scenarios**: Document important edge cases
2. **Create Scenario Definitions**: Use the framework to formalize tests
3. **Validate Expectations**: Ensure scenarios pass consistently
4. **Integrate with CI**: Add to automated test pipeline
5. **Monitor Performance**: Track execution times and success rates

### Updating for Rule Changes

1. **Review Affected Scenarios**: Identify scenarios impacted by rule changes
2. **Update Expectations**: Modify validator functions as needed
3. **Add Regression Tests**: Create tests for new edge cases
4. **Update Documentation**: Document changes in scenario behavior

## Contributing

### Adding New Scenarios

1. Choose appropriate category (`ClockEdgeCases.ts`, `DesperationPlays.ts`, etc.)
2. Add comprehensive test cases in the existing `describe` block
3. Include helper functions for scenario state creation
4. Add scenario definition to `run-two-minute-suite.mjs`
5. Update this documentation

### Code Style

- Follow existing patterns in each test file
- Use descriptive test names and error messages
- Include performance considerations in scenario design
- Maintain consistent formatting and documentation

---

*Last Updated: October 2025*
*Version: 1.0.0*
