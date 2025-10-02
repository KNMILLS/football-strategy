import { PenaltyTableSchema } from '../schemas/MatchupTable';
import { validatePenaltyTable } from '../schemas/validators';
import { fetchJson, getOrFetch, ok, err } from './http';
/**
 * Fetches and validates a penalty table from the given path
 */
export async function fetchPenaltyTable(tablePath) {
    const key = `data/${tablePath}`;
    return getOrFetch(key, async () => {
        const jsonRes = await fetchJson(key);
        if (!jsonRes.ok)
            return jsonRes;
        // Parse with Zod schema
        const parsed = PenaltyTableSchema.safeParse(jsonRes.data);
        if (!parsed.success) {
            return err('SCHEMA', `Invalid penalty table format: ${parsed.error.message}`);
        }
        // Run business logic validation
        const validation = validatePenaltyTable(parsed.data);
        if (!validation.valid) {
            return err('VALIDATION', `Penalty table validation failed: ${validation.errors.join(', ')}`);
        }
        return ok(parsed.data);
    });
}
/**
 * Fetches a penalty table by name
 */
export async function fetchPenaltyTableByName(tableName) {
    // Convert table name to file path format
    const formattedName = tableName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const tablePath = `penalties/${formattedName}.json`;
    return fetchPenaltyTable(tablePath);
}
//# sourceMappingURL=penaltyTables.js.map