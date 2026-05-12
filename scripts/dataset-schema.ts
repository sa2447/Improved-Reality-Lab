import { z } from "zod";

const stateSchema = z.object({
  stateCode: z.string().regex(/^[A-Z]{2}$/),
  housing: z.number().finite().nonnegative(),
  food: z.number().finite().nonnegative(),
  transportation: z.number().finite().nonnegative(),
  healthcare: z.number().finite().nonnegative(),
  utilities: z.number().finite().nonnegative(),
  taxes: z.number().finite().nonnegative(),
  minimumWage: z.number().finite().nonnegative(),
  livingWage: z.number().finite().nonnegative(),
});

export const datasetSchema = z.object({
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  effectiveDate: z.iso.date(),
  states: z.array(stateSchema).min(1),
});

export type DatasetInput = z.infer<typeof datasetSchema>;
