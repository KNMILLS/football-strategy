import { getCurrentEngine, getFeatureFlags } from './FeatureFlags';
/**
 * Deterministic engine (legacy system)
 * This is a stub for now - the actual implementation would come from ResolvePlayCore.ts
 */
class DeterministicEngine {
    resolvePlay(offCardId, defCardId, state, rng) {
        // TODO: Implement deterministic resolution logic
        return {
            yards: 0,
            clock: '30'
        };
    }
}
/**
 * Dice engine (new 2d20 system)
 */
class DiceEngine {
    resolvePlay(offCardId, defCardId, state, rng) {
        // Import here to avoid circular dependencies
        const { resolveSnap } = require('../rules/ResolveSnap');
        // TODO: Load matchup table and penalty table based on card IDs
        // For now, return a stub result
        return {
            yards: 0,
            clock: '30'
        };
    }
}
/**
 * Engine factory and selector
 */
class EngineFactory {
    engines = new Map();
    constructor() {
        this.engines.set('deterministic', new DeterministicEngine());
        this.engines.set('dice', new DiceEngine());
    }
    getEngine(engineType) {
        const type = engineType || getCurrentEngine();
        const engine = this.engines.get(type);
        if (!engine) {
            console.warn(`Unknown engine type: ${type}, falling back to deterministic`);
            return this.engines.get('deterministic');
        }
        return engine;
    }
    getCurrentEngine() {
        return this.getEngine();
    }
    resolvePlay(offCardId, defCardId, state, rng) {
        return this.getCurrentEngine().resolvePlay(offCardId, defCardId, state, rng);
    }
}
/**
 * Singleton engine factory instance
 */
export const engineFactory = new EngineFactory();
/**
 * Convenience function to resolve a play using the current engine
 */
export function resolvePlay(offCardId, defCardId, state, rng) {
    return engineFactory.resolvePlay(offCardId, defCardId, state, rng);
}
/**
 * Get information about the current engine
 */
export function getCurrentEngineInfo() {
    const flags = getFeatureFlags();
    const type = getCurrentEngine();
    const info = {
        deterministic: {
            name: 'Deterministic Engine',
            description: 'Legacy card-based resolution system'
        },
        dice: {
            name: 'Dice Engine',
            description: 'New 2d20 dice-based resolution system'
        }
    };
    return {
        type,
        ...info[type]
    };
}
//# sourceMappingURL=EngineSelector.js.map