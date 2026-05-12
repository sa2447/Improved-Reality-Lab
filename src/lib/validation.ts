import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

const optionalMoney = z.number().finite().nonnegative().optional();

export const profileSchema = z.object({
  salary: optionalMoney,
  hourlyWage: optionalMoney,
  rent: optionalMoney,
  transportation: optionalMoney,
  healthcare: optionalMoney,
  food: optionalMoney,
  debt: optionalMoney,
  dependents: z.number().int().nonnegative().max(20).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
