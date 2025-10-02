import { MatchupTableSchema } from '../schemas/MatchupTable';
import { validateMatchupTable } from '../schemas/validators';
import { fetchJson, getOrFetch, ok, err } from './http';
/**
 * Fetches and validates a matchup table from the given path
 */
export async function fetchMatchupTable(tablePath) {
    const key = `data/${tablePath}`;
    return getOrFetch(key, async () => {
        const jsonRes = await fetchJson(key);
        if (!jsonRes.ok)
            return jsonRes;
        // Parse with Zod schema
        const parsed = MatchupTableSchema.safeParse(jsonRes.data);
        if (!parsed.success) {
            return err('SCHEMA', `Invalid matchup table format: ${parsed.error.message}`);
        }
        // Run business logic validation
        const validation = validateMatchupTable(parsed.data);
        if (!validation.valid) {
            return err('VALIDATION', `Matchup table validation failed: ${validation.errors.join(', ')}`);
        }
        return ok(parsed.data);
    });
}
/**
 * Fetches a matchup table by offensive and defensive card names
 */
export async function fetchMatchupTableByCards(offCard, defCard) {
    // Convert card names to file path format
    const offCardFormatted = offCard.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const defCardFormatted = defCard.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const tablePath = `${offCardFormatted}__${defCardFormatted}.json`;
    return fetchMatchupTable(tablePath);
}
//# sourceMappingURL=matchupTables.js.map