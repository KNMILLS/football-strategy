/**
 * GameFlow - Main game flow orchestration class
 *
 * This class serves as a facade/wrapper around the modular GameFlowCore,
 * maintaining backward compatibility while delegating to the new modular structure.
 *
 * The class has been significantly reduced from 442 lines to focus only on:
 * - Public API compatibility
 * - Delegation to GameFlowCore
 * - Maintaining existing interface contracts
 */
import { GameFlowCore } from './core/GameFlowCore';
/**
 * Main game flow orchestration class
 * Coordinates all aspects of game flow including plays, scoring, penalties, and time management
 */
export class GameFlow {
    ctx;
    core;
    constructor(ctx) {
        this.ctx = ctx;
        this.core = new GameFlowCore(ctx);
    }
    /**
     * Resolves a snap (play) and returns the resulting game state and events
     * @param state - Current game state
     * @param input - Play input containing deck, play label, and defense
     * @returns Updated game state and generated events
     */
    resolveSnap(state, input) {
        return this.core.resolveSnap(state, input);
    }
    /**
     * Finalizes a penalty decision and returns the resulting state and events
     * @param chosen - The chosen game state (accepted or declined penalty)
     * @param decision - Whether penalty was accepted or declined
     * @param meta - Penalty administration metadata
     * @param info - Optional penalty information
     * @returns Updated game state and events
     */
    finalizePenaltyDecision(chosen, decision, meta, info) {
        return this.core.finalizePenaltyDecision(chosen, decision, meta, info);
    }
    /**
     * Resolves PAT (Point After Touchdown) and restart logic
     * @param state - Current game state
     * @param side - Team that scored
     * @returns Updated game state and events
     */
    resolvePATAndRestart(state, side) {
        return this.core.resolvePATAndRestart(state, side);
    }
    /**
     * Attempts a field goal
     * @param state - Current game state
     * @param attemptYards - Distance of field goal attempt
     * @param side - Team attempting the field goal
     * @returns Updated game state and events
     */
    attemptFieldGoal(state, attemptYards, side) {
        return this.core.attemptFieldGoal(state, attemptYards, side);
    }
    /**
     * Resolves safety restart after a safety
     * @param state - Current game state
     * @param conceding - Team that conceded the safety
     * @returns Updated game state and events
     */
    resolveSafetyRestart(state, conceding) {
        return this.core.resolveSafetyRestart(state, conceding);
    }
    /**
     * Performs a kickoff
     * @param state - Current game state
     * @param type - Type of kickoff (normal or onside)
     * @param kicking - Team performing the kickoff
     * @returns Updated game state and events
     */
    performKickoff(state, type, kicking) {
        return this.core.performKickoff(state, type, kicking);
    }
}
//# sourceMappingURL=GameFlow.js.map