import { z } from 'zod';
export const TimeKeepingFlatSchema = z.object({
    gain0to20: z.number(),
    gain20plus: z.number(),
    loss: z.number(),
    outOfBounds: z.number(),
    incomplete: z.number(),
    interception: z.number(),
    penalty: z.number(),
    fumble: z.number(),
    kickoff: z.number(),
    fieldgoal: z.number(),
    punt: z.number(),
    extraPoint: z.number(),
});
// Rich schema: matches data/time_keeping.json
export const TimeKeepingRichSchema = z.object({
    name: z.string(),
    units: z.string(),
    rules: z.array(z.object({
        event: z.string(),
        duration: z.number().optional(),
        adjustment: z.number().optional(),
    })),
});
export const TimeKeepingSchema = z.union([TimeKeepingFlatSchema, TimeKeepingRichSchema]);
//# sourceMappingURL=Timekeeping.js.map