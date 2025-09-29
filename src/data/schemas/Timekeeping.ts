import { z } from 'zod';

export const TimeKeepingSchema = z.object({
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

export type TimeKeeping = z.infer<typeof TimeKeepingSchema>;


