import { z } from 'zod';

export const PlaceKickRowSchema = z.record(z.string(), z.enum(['G','NG']));
export const PlaceKickTableSchema = z.record(z.string().regex(/^\d+$/), PlaceKickRowSchema);

export type PlaceKickTable = z.infer<typeof PlaceKickTableSchema>;


