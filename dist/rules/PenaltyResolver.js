import { fetchPenaltyTableByName } from '../data/loaders/penaltyTables';
/**
 * Resolves a penalty using the d10 penalty table system
 * Used when 2-19 doubles are rolled in the dice system
 */
export async function resolvePenaltyFromTable(tableName, rng) {
    // Fetch the penalty table
    const tableResult = await fetchPenaltyTableByName(tableName);
    if (!tableResult.ok) {
        throw new Error(`Failed to load penalty table '${tableName}': ${tableResult.error}`);
    }
    const table = tableResult.data;
    // Roll d10 (1-10)
    const roll = Math.floor(rng() * 10) + 1;
    const slot = roll.toString();
    const entry = table.entries[slot];
    if (!entry) {
        throw new Error(`No penalty entry found for slot ${slot} in table ${tableName}`);
    }
    // Convert table entry to PenaltyInfo
    let penalty;
    if (entry.side === 'offset') {
        // For offsetting penalties, randomly choose a side and use smaller yardage
        const side = rng() < 0.5 ? 'offense' : 'defense';
        penalty = {
            on: side,
            yards: 5,
            ...(entry.auto_first_down && { firstDown: true })
        };
    }
    else {
        penalty = {
            on: entry.side,
            yards: entry.yards || 10, // Default to 10 if no yards specified
            ...(entry.auto_first_down && { firstDown: true })
        };
    }
    // Check if this is a forced override (slots 4, 5, 6)
    const isForcedOverride = entry.override_play_result === true;
    return {
        penalty,
        isForcedOverride,
        tableEntry: entry
    };
}
/**
 * Synchronous version for testing - requires pre-loaded table
 */
export function resolvePenaltyFromTableSync(table, rng) {
    // Roll d10 (1-10)
    const roll = Math.floor(rng() * 10) + 1;
    const slot = roll.toString();
    const entry = table.entries[slot];
    if (!entry) {
        throw new Error(`No penalty entry found for slot ${slot}`);
    }
    // Convert table entry to PenaltyInfo
    let penalty;
    if (entry.side === 'offset') {
        // For offsetting penalties, randomly choose a side and use smaller yardage
        const side = rng() < 0.5 ? 'offense' : 'defense';
        penalty = {
            on: side,
            yards: 5,
            ...(entry.auto_first_down && { firstDown: true })
        };
    }
    else {
        penalty = {
            on: entry.side,
            yards: entry.yards || 10, // Default to 10 if no yards specified
            ...(entry.auto_first_down && { firstDown: true })
        };
    }
    // Check if this is a forced override (slots 4, 5, 6)
    const isForcedOverride = entry.override_play_result === true;
    return {
        penalty,
        isForcedOverride,
        tableEntry: entry
    };
}
//# sourceMappingURL=PenaltyResolver.js.map