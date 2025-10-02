import { createLCG } from '../../sim/RNG';
import { resolveSnap } from '../../rules/ResolveSnap';
/**
 * EV Calculator for dice-aware AI decision making
 * Uses seeded simulations to calculate expected values for play candidates
 */
export class EVCalculator {
    SIMULATION_COUNT = 200; // Standard simulations
    CI_SIMULATION_COUNT = 100; // Reduced for CI performance
    /**
     * Calculate expected value for a play candidate
     */
    calculateEV(candidate, context, rngSeed, useCISettings = false) {
        // Check if we have proper matchup tables for simulation
        if (this.hasValidTables(candidate.matchupTable, candidate.penaltyTable)) {
            return this.calculateEVWithSimulation(candidate, context, rngSeed, useCISettings);
        }
        else {
            // Fall back to heuristic calculation for testing/missing data
            return this.calculateEVHeuristic(candidate, context);
        }
    }
    /**
     * Check if tables are valid for simulation
     */
    hasValidTables(matchupTable, penaltyTable) {
        return matchupTable?.entries && penaltyTable?.entries &&
            Object.keys(matchupTable.entries).length > 0 &&
            Object.keys(penaltyTable.entries).length > 0;
    }
    /**
     * Calculate EV using full dice simulation
     */
    calculateEVWithSimulation(candidate, context, rngSeed, useCISettings) {
        const simulationCount = useCISettings ? this.CI_SIMULATION_COUNT : this.SIMULATION_COUNT;
        const rng = createLCG(rngSeed);
        let totalYards = 0;
        let totalClockRunoff = 0;
        let turnoverCount = 0;
        let firstDownCount = 0;
        let totalPoints = 0;
        // Run simulations
        for (let i = 0; i < simulationCount; i++) {
            const result = resolveSnap(candidate.offenseCardId, candidate.defensePlay, candidate.matchupTable, candidate.penaltyTable, context.gameState, rng);
            // Handle penalty acceptance/decline (simplified: always decline for now)
            let finalYards = result.finalYards ?? result.baseOutcome?.yards ?? 0;
            let finalClockRunoff = result.finalClockRunoff;
            // Calculate points value based on field position
            const points = context.scorePosition(finalYards, context.gameState.ballOn + finalYards);
            totalYards += finalYards;
            totalClockRunoff += finalClockRunoff;
            totalPoints += points;
            // Count turnovers
            if (result.baseOutcome?.turnover || result.doubles === 'DEF_TD') {
                turnoverCount++;
            }
            // Count first downs (simplified check)
            if (finalYards >= context.gameState.toGo) {
                firstDownCount++;
            }
        }
        // Calculate averages
        const expectedYards = totalYards / simulationCount;
        const turnoverProbability = turnoverCount / simulationCount;
        const firstDownProbability = firstDownCount / simulationCount;
        const expectedClockRunoff = totalClockRunoff / simulationCount;
        const expectedPoints = totalPoints / simulationCount;
        // Calculate utility (weighted combination of factors)
        const utility = this.calculateUtility({
            expectedYards,
            expectedPoints,
            firstDownProbability,
            turnoverProbability,
            context
        });
        return {
            expectedYards,
            turnoverProbability,
            firstDownProbability,
            expectedClockRunoff,
            expectedPoints,
            utility,
            samples: simulationCount
        };
    }
    /**
     * Calculate EV using heuristic estimation (for testing/missing data)
     */
    calculateEVHeuristic(candidate, context) {
        const baseYards = this.getHeuristicYards(candidate, context.gameState);
        const turnoverProb = this.getHeuristicTurnoverProbability(candidate);
        const firstDownProb = Math.min(0.8, baseYards / context.gameState.toGo);
        const clockRunoff = this.getHeuristicClockRunoff(context.gameState);
        const points = context.scorePosition(baseYards, context.gameState.ballOn + baseYards);
        const utility = this.calculateUtility({
            expectedYards: baseYards,
            expectedPoints: points,
            firstDownProbability: firstDownProb,
            turnoverProbability: turnoverProb,
            context
        });
        return {
            expectedYards: baseYards,
            turnoverProbability: turnoverProb,
            firstDownProbability: firstDownProb,
            expectedClockRunoff: clockRunoff,
            expectedPoints: points,
            utility,
            samples: 0 // Heuristic, no samples
        };
    }
    /**
     * Get heuristic yards for a play type
     */
    getHeuristicYards(candidate, gameState) {
        // Simple heuristic based on play type and field position
        const playType = candidate.offenseCardId.toLowerCase();
        if (playType.includes('pass') && playType.includes('deep')) {
            return gameState.ballOn > 50 ? 8 : 3;
        }
        if (playType.includes('pass') && playType.includes('short')) {
            return gameState.ballOn > 50 ? 6 : 4;
        }
        if (playType.includes('run') && playType.includes('inside')) {
            return gameState.down <= 2 ? 4 : 2;
        }
        if (playType.includes('run') && playType.includes('outside')) {
            return gameState.ballOn > 40 ? 5 : 3;
        }
        return 4; // Default
    }
    /**
     * Get heuristic turnover probability
     */
    getHeuristicTurnoverProbability(candidate) {
        const playType = candidate.offenseCardId.toLowerCase();
        if (playType.includes('pass') && playType.includes('deep'))
            return 0.15;
        if (playType.includes('pass') && playType.includes('short'))
            return 0.08;
        if (playType.includes('run'))
            return 0.05;
        return 0.1; // Default
    }
    /**
     * Get heuristic clock runoff
     */
    getHeuristicClockRunoff(gameState) {
        if (gameState.down >= 3)
            return 20;
        return 30;
    }
    /**
     * Calculate multiple EVs for different defensive responses
     */
    calculateEVMatrix(offenseCardId, playbook, matchupTables, penaltyTable, context, rngSeed, useCISettings = false) {
        const results = new Map();
        for (const [defensePlay, matchupTable] of matchupTables) {
            const candidate = {
                playbook,
                offenseCardId,
                defensePlay,
                matchupTable,
                penaltyTable
            };
            results.set(defensePlay, this.calculateEV(candidate, context, rngSeed++, useCISettings));
        }
        return results;
    }
    /**
     * Calculate utility value for AI decision making
     * Balances yards, points, first downs vs turnovers and time
     */
    calculateUtility(params) {
        const { expectedYards, expectedPoints, firstDownProbability, turnoverProbability, context } = params;
        // Base utility from yards and points
        let utility = expectedYards * 0.1 + expectedPoints * 0.3;
        // Bonus for first downs (sustains drives)
        utility += firstDownProbability * 0.2;
        // Penalty for turnovers (very costly)
        utility -= turnoverProbability * 0.8;
        // Clock management factor
        const clockFactor = context.gameState.clock <= 300 ? 1.2 : 1.0; // More aggressive late
        utility *= clockFactor;
        // Field position context
        const fieldBonus = context.fieldPositionValue(context.gameState.ballOn);
        utility += fieldBonus * 0.1;
        return Math.max(-1, Math.min(1, utility)); // Clamp to [-1, 1]
    }
}
/**
 * Default scoring model for expected points
 */
export function defaultScorePosition(yardsGained, newFieldPosition) {
    if (newFieldPosition >= 100)
        return 7; // Touchdown
    if (newFieldPosition <= 0)
        return -2; // Safety
    // Simplified field goal probability (rough approximation)
    const distanceToFG = 100 - newFieldPosition;
    if (distanceToFG <= 40)
        return 3; // High probability FG range (35-40 yards)
    if (distanceToFG <= 55)
        return 1.5; // Medium probability (45-55 yards)
    if (distanceToFG <= 70)
        return 0.5; // Low probability (60-70 yards)
    return 0; // No scoring value
}
/**
 * Default field position value function
 */
export function defaultFieldPositionValue(position) {
    // Prefer midfield over goal line situations
    if (position <= 20 || position >= 80)
        return -0.1; // Bad field position
    if (position >= 40 && position <= 60)
        return 0.1; // Good field position
    return 0; // Neutral
}
//# sourceMappingURL=EVCalculator.js.map