import { z } from 'zod';

export const DefenseLetterSchema = z.enum(['A','B','C','D','E','F','G','H','I','J']);

export const PlayResultSchema = z.string();

export const PlayLetterMapSchema = z.record(DefenseLetterSchema, PlayResultSchema);

export const DeckPlaysSchema = z.record(z.string(), PlayLetterMapSchema);

export const OffenseChartsSchema = z.object({
  ProStyle: DeckPlaysSchema,
  BallControl: DeckPlaysSchema,
  AerialStyle: DeckPlaysSchema,
});

export type OffenseCharts = z.infer<typeof OffenseChartsSchema>;


