import { z } from 'zod';

// Normalized schema: { "2": { PAT: 'NG', '1-12': 'NG', ... }, ... }
export const PlaceKickRowSchema = z.record(z.string(), z.enum(['G','NG']));
export const PlaceKickTableNormalizedSchema = z.record(z.string().regex(/^\d+$/), PlaceKickRowSchema);

// Rich schema: matches data/place_kicking.json
export const PlaceKickRichSchema = z.object({
  name: z.string(),
  dice: z.string(),
  columns: z.array(z.object({ range: z.string(), min: z.number().nullable().optional(), max: z.number().nullable().optional() })),
  results: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
});

export const PlaceKickTableSchema = z.union([PlaceKickTableNormalizedSchema, PlaceKickRichSchema]);

export type PlaceKickTable = z.infer<typeof PlaceKickTableSchema>;


