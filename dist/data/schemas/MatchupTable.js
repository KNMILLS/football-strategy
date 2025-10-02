import { z } from 'zod';
// Schema for individual dice outcomes (sums 3-39)
export const DiceOutcomeSchema = z.object({
    yards: z.number().int(),
    clock: z.enum(['10', '20', '30']),
    tags: z.array(z.string()).optional(),
    // Optional fields for special outcomes
    turnover: z.object({
        type: z.enum(['INT', 'FUM']),
        return_yards: z.number().int(),
        return_to: z.enum(['LOS']),
    }).optional(),
    oob: z.boolean().optional(),
});
// Schema for doubles outcomes (1-1, 20-20, 2-19)
export const DoublesOutcomeSchema = z.object({
    result: z.enum(['DEF_TD', 'OFF_TD']),
    // For penalty doubles (2-19)
    penalty_table_ref: z.string().optional(),
});
// Schema for complete matchup table
export const MatchupTableSchema = z.object({
    version: z.string(),
    off_card: z.string(),
    def_card: z.string(),
    dice: z.literal('2d20'),
    entries: z.record(z.enum(['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39']), DiceOutcomeSchema),
    doubles: z.object({
        '1': DoublesOutcomeSchema,
        '20': DoublesOutcomeSchema,
        '2-19': z.object({
            penalty_table_ref: z.string(),
        }),
    }),
    meta: z.object({
        oob_bias: z.boolean(),
        field_pos_clamp: z.boolean(),
        risk_profile: z.enum(['low', 'medium', 'high']),
        explosive_start_sum: z.number().int().min(20).max(39),
    }),
}).refine((data) => {
    // GDD requirement: Turnover band includes 3–5 at minimum
    const entries3to5 = ['3', '4', '5'].every(key => key in data.entries);
    if (!entries3to5) {
        return false;
    }
    // GDD requirement: Field-position clamp - yards never exceed remaining field
    // This is enforced at runtime by the game engine, but we can validate basic constraints
    for (const [sum, outcome] of Object.entries(data.entries)) {
        const sumNum = parseInt(sum);
        // Turnover outcomes should have return_yards if specified
        if (outcome.turnover) {
            if (outcome.turnover.return_yards !== undefined && outcome.turnover.return_yards < 0) {
                return false; // Return yards cannot be negative
            }
            if (outcome.turnover.return_to && outcome.turnover.return_to !== 'LOS') {
                return false; // Only LOS returns are supported
            }
        }
    }
    return true;
}, {
    message: "Table does not meet GDD requirements: must include entries 3-5 for turnover band, return yards must be non-negative, and return_to must be 'LOS'",
});
// Schema for penalty table (10 slots for d10 rolls)
export const PenaltyTableSchema = z.object({
    version: z.string(),
    entries: z.object({
        // 1-10 penalty outcomes
        '1': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
        '2': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
        '3': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
        // Slots 4, 5, 6 are forced overrides (ignore play result)
        '4': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.literal(true), // Must be true for forced overrides
            label: z.string(),
        }),
        '5': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.literal(true), // Must be true for forced overrides
            label: z.string(),
        }),
        '6': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.literal(true), // Must be true for forced overrides
            label: z.string(),
        }),
        '7': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
        '8': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
        '9': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
        '10': z.object({
            side: z.enum(['offense', 'defense', 'offset']),
            yards: z.number().int().optional(),
            auto_first_down: z.boolean().optional(),
            loss_of_down: z.boolean().optional(),
            replay_down: z.boolean().optional(),
            override_play_result: z.boolean().optional(),
            label: z.string(),
        }),
    }),
});
//# sourceMappingURL=MatchupTable.js.map