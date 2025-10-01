import { z } from 'zod';
const LongGainEntrySchema = z.object({
    baseYards: z.number(),
    extra: z
        .object({
        die: z.literal('1d6'),
        multiplier: z.number(),
    })
        .optional(),
});
export const LongGainSchema = z.object({
    results: z.record(z.string().regex(/^[1-6]$/), LongGainEntrySchema),
});
export function toLongGain(json) {
    const parsed = LongGainSchema.safeParse(json);
    if (parsed.success)
        return parsed.data.results;
    return undefined;
}
//# sourceMappingURL=longGain.js.map