import { getCurrentEngine, getFeatureFlags } from './FeatureFlags';
/**
 * Deterministic engine (legacy system using card charts)
 */
class DeterministicEngine {
    offenseCharts = null;
    async initialize() {
        if (this.offenseCharts)
            return;
        try {
            // Load offense charts for deterministic resolution
            const { fetchOffenseCharts } = await import('../data/loaders/offenseCharts');
            const chartsResult = await fetchOffenseCharts();
            if (chartsResult.ok) {
                this.offenseCharts = chartsResult.data;
            }
        }
        catch (error) {
            console.warn('Failed to load offense charts for deterministic engine:', error);
        }
    }
    resolvePlay(offCardId, defCardId, state, rng) {
        // Map card IDs to play labels for deterministic resolution
        const offenseCard = this.findOffenseCard(offCardId);
        const defenseCard = this.findDefenseCard(defCardId);
        if (!offenseCard) {
            console.warn(`Unknown offense card ID: ${offCardId}`);
            return { yards: 0, clock: '30' };
        }
        if (!defenseCard) {
            console.warn(`Unknown defense card ID: ${defCardId}`);
            return { yards: 0, clock: '30' };
        }
        // Use the existing resolvePlayCore function if charts are available
        if (this.offenseCharts) {
            try {
                const { resolvePlayCore } = require('../rules/ResolvePlayCore');
                const result = resolvePlayCore({
                    state,
                    charts: this.offenseCharts,
                    deckName: offenseCard.deck,
                    playLabel: offenseCard.label,
                    defenseLabel: defenseCard.label,
                    rng
                });
                // Convert the result to our ResolveResult format
                return this.convertDeterministicResult(result, offenseCard.label, defenseCard.label);
            }
            catch (error) {
                console.warn('Failed to use resolvePlayCore, falling back to stub:', error);
            }
        }
        // Fallback stub result
        return {
            yards: 0,
            clock: '30'
        };
    }
    convertDeterministicResult(result, playLabel, defenseLabel) {
        // Convert the existing result format to our unified ResolveResult format
        // This is a placeholder - we'd need to properly map all the fields
        return {
            yards: result.outcome?.yards || 0,
            turnover: result.outcome?.category === 'interception' || result.outcome?.category === 'fumble',
            clock: '30', // TODO: Map from result.outcome properly
            tags: [playLabel, defenseLabel]
        };
    }
    findOffenseCard(cardId) {
        // For dice engine compatibility, we need to map old card IDs to dice engine play IDs
        // This is a simplified mapping - in a real implementation we'd have a proper mapping table
        const cardMappings = {
            // Map some common card IDs to dice engine plays
            'ProStyle_PowerUpMiddle': { id: 'sm-power-o', label: 'Power O', deck: 'Smashmouth' },
            'ProStyle_PowerOffTackle': { id: 'sm-power-o', label: 'Power O', deck: 'Smashmouth' },
            'ProStyle_EndRun': { id: 'wz-inside-zone', label: 'Inside Zone', deck: 'Wide Zone' },
            // Add more mappings as needed for backward compatibility
        };
        return cardMappings[cardId] || {
            id: cardId,
            label: cardId,
            deck: 'West Coast'
        };
    }
    findDefenseCard(cardId) {
        // Map old defense card IDs to dice engine defensive plays
        const defenseMappings = {
            'Defense_GoalLine': 'Goal Line',
            'Defense_ShortYardage': 'Short Yardage',
            'Defense_InsideBlitz': 'Inside Blitz',
            'Defense_Running': 'Running',
            'Defense_RunAndPass': 'Run & Pass',
            'Defense_PassAndRun': 'Pass & Run',
            'Defense_Passing': 'Passing',
            'Defense_OutsideBlitz': 'Outside Blitz',
            'Defense_Prevent': 'Prevent',
            'Defense_PreventDeep': 'Prevent Deep',
        };
        return {
            id: cardId,
            label: defenseMappings[cardId] || 'Cover 2'
        };
    }
}
/**
 * Dice engine (new 2d20 system)
 */
class DiceEngine {
    matchupTable = null;
    penaltyTable = null;
    async initialize() {
        if (this.matchupTable && this.penaltyTable)
            return;
        try {
            // Load matchup and penalty tables for dice resolution
            const { fetchMatchupTable } = await import('../data/loaders/matchupTables');
            const { fetchPenaltyTableByName } = await import('../data/loaders/penaltyTables');
            const [matchupResult, penaltyResult] = await Promise.all([
                fetchMatchupTable('play_vs_defense_outcomes.json'),
                // Our penalties live at data/penalties/nfl-penalties-v1.json → name is 'nfl-penalties-v1'
                fetchPenaltyTableByName('nfl-penalties-v1')
            ]);
            if (matchupResult.ok) {
                this.matchupTable = matchupResult.data;
            }
            if (penaltyResult.ok) {
                this.penaltyTable = penaltyResult.data;
            }
        }
        catch (error) {
            console.warn('Failed to load dice tables for dice engine:', error);
        }
    }
    resolvePlay(offCardId, defCardId, state, rng) {
        // Map card IDs to play labels for dice resolution. For the dice engine,
        // card identity is informational only (tables are global). If not found
        // in legacy decks, proceed with placeholders so dice engine still runs.
        const offenseCard = this.findOffenseCard(offCardId) || { id: offCardId, label: String(offCardId) };
        const defenseCard = this.findDefenseCard(defCardId) || { id: defCardId, label: String(defCardId) };
        // Use the dice resolution system if tables are available
        if (this.penaltyTable) {
            try {
                // Generate the correct table filename based on offense and defense card IDs
                const tableFilename = this.generateTableFilename(offenseCard.id, defenseCard.id);
                console.log('📁 Generated filename:', tableFilename);
                // Load the specific matchup table for this play/defense combination
                // Use our own filename generation instead of the loader's formatting
                const { fetchMatchupTable } = require('../data/loaders/matchupTables');
                const matchupResult = fetchMatchupTable(tableFilename);
                console.log('🔍 DICE DEBUG:', {
                    offenseCardId: offenseCard.id,
                    defenseCardLabel: defenseCard.label,
                    tableFilename,
                    matchupResult: matchupResult ? { ok: matchupResult.ok, error: matchupResult.error } : 'undefined'
                });
                if (matchupResult && matchupResult.ok) {
                    console.log('📊 Matchup table loaded, entries:', Object.keys(matchupResult.data.entries || {}).length);
                    console.log('📋 Sample entries:', Object.keys(matchupResult.data.entries || {}).slice(0, 5));
                    const { resolveSnap } = require('../rules/ResolveSnap');
                    const diceResult = resolveSnap(offenseCard.id, defenseCard.id, matchupResult.data, this.penaltyTable, state, rng);
                    console.log('🎲 Dice result:', {
                        diceRoll: diceResult.diceRoll,
                        finalYards: diceResult.finalYards,
                        doubles: diceResult.doubles,
                        baseOutcome: diceResult.baseOutcome
                    });
                    // Convert the dice result to our ResolveResult format
                    return this.convertDiceResult(diceResult, offenseCard.label, defenseCard.label);
                }
                else {
                    console.warn(`❌ Failed to load matchup table for ${tableFilename}:`, matchupResult?.error);
                    throw new Error(`No matchup table found for ${tableFilename}`);
                }
            }
            catch (error) {
                console.warn('Failed to use resolveSnap, falling back to legacy system:', error);
                throw error;
            }
        }
        // This should not be reached if dice engine is properly configured
        throw new Error('Dice engine not available for this game type');
    }
    convertDiceResult(diceResult, playLabel, defenseLabel) {
        // Convert the dice result format to our unified ResolveResult format
        const result = {
            yards: diceResult.finalYards || diceResult.baseOutcome?.yards || 0,
            clock: diceResult.finalClockRunoff.toString(),
            tags: [playLabel, defenseLabel, ...diceResult.tags]
        };
        // Handle turnovers
        if (diceResult.baseOutcome?.turnover) {
            result.turnover = {
                type: diceResult.baseOutcome.turnover.type,
                return_yards: diceResult.baseOutcome.turnover.return_yards,
                return_to: diceResult.baseOutcome.turnover.return_to
            };
        }
        // Handle doubles
        if (diceResult.doubles) {
            result.doubles = { kind: diceResult.doubles };
        }
        // Handle penalties
        if (diceResult.penalty) {
            result.penalty = {
                side: diceResult.penalty.penaltyInfo.side,
                yards: diceResult.penalty.penaltyInfo.yards,
                label: diceResult.penalty.penaltyInfo.label,
                override_play_result: diceResult.penalty.overridesPlayResult
            };
            if (diceResult.canAcceptDecline) {
                result.options = { can_accept_decline: true };
            }
        }
        return result;
    }
    findOffenseCard(cardId) {
        // For dice engine compatibility, we need to map old card IDs to dice engine play IDs
        // This is a simplified mapping - in a real implementation we'd have a proper mapping table
        const cardMappings = {
            // Map some common card IDs to dice engine plays
            'ProStyle_PowerUpMiddle': { id: 'sm-power-o', label: 'Power O', deck: 'Smashmouth' },
            'ProStyle_PowerOffTackle': { id: 'sm-power-o', label: 'Power O', deck: 'Smashmouth' },
            'ProStyle_EndRun': { id: 'wz-inside-zone', label: 'Inside Zone', deck: 'Wide Zone' },
            // Add more mappings as needed for backward compatibility
        };
        return cardMappings[cardId] || {
            id: cardId,
            label: cardId,
            deck: 'West Coast'
        };
    }
    findDefenseCard(cardId) {
        // Map old defense card IDs to dice engine defensive plays
        const defenseMappings = {
            'Defense_GoalLine': 'Goal Line',
            'Defense_ShortYardage': 'Short Yardage',
            'Defense_InsideBlitz': 'Inside Blitz',
            'Defense_Running': 'Running',
            'Defense_RunAndPass': 'Run & Pass',
            'Defense_PassAndRun': 'Pass & Run',
            'Defense_Passing': 'Passing',
            'Defense_OutsideBlitz': 'Outside Blitz',
            'Defense_Prevent': 'Prevent',
            'Defense_PreventDeep': 'Prevent Deep',
        };
        return {
            id: cardId,
            label: defenseMappings[cardId] || 'Cover 2'
        };
    }
    generateTableFilename(offenseCardId, defenseCardId) {
        // Map offense card IDs to their corresponding table names
        const offenseTableMap = {
            'SP_BUBBLE': 'spread-rpo-bubble',
            'SP_RPO_BUBBLE': 'spread-rpo-bubble',
            // Add other mappings as needed
        };
        // Extract play name from offense card ID, using mapping if available
        const offensePlay = offenseTableMap[offenseCardId] || offenseCardId;
        // Extract defense name from defense card ID (e.g., "Defense_Cover1" -> "def-cover-1")
        const defenseName = defenseCardId
            .replace(/^Defense_/, 'def-')
            .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
            .replace(/^_/, '');
        // Determine the playbook directory based on the offense card ID prefix
        let playbookDir = 'west-coast'; // default (note: hyphen, not underscore)
        if (offenseCardId.startsWith('spread-') || offenseCardId.startsWith('SP_')) {
            playbookDir = 'spread';
        }
        else if (offenseCardId.startsWith('ar-')) {
            playbookDir = 'air_raid';
        }
        else if (offenseCardId.startsWith('sm-')) {
            playbookDir = 'smashmouth';
        }
        else if (offenseCardId.startsWith('wz-')) {
            playbookDir = 'wide_zone';
        }
        // Construct full path (e.g., "tables_v1/spread/spread-rpo-bubble__def-cover-1.json")
        return `tables_v1/${playbookDir}/${offensePlay}__${defenseName}.json`;
    }
}
/**
 * Engine factory and selector
 */
class EngineFactory {
    engines = new Map();
    initialized = false;
    constructor() {
        this.engines.set('deterministic', new DeterministicEngine());
        this.engines.set('dice', new DiceEngine());
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Initialize all engines asynchronously
            const engines = [this.engines.get('deterministic'), this.engines.get('dice')];
            await Promise.all(engines.map(engine => engine?.initialize()));
            this.initialized = true;
        }
        catch (error) {
            console.warn('Failed to initialize engines:', error);
        }
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
    async resolvePlay(offCardId, defCardId, state, rng) {
        // Ensure engines are initialized
        if (!this.initialized) {
            await this.initialize();
        }
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
export async function resolvePlay(offCardId, defCardId, state, rng) {
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