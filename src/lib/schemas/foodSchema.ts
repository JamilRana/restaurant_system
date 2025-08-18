// lib/schemas/foodSchema.ts
import { z } from "zod";

const foodOptionSchema = z.object({
  id:z.number().optional(),
  name: z.string().min(1, "Option name required"),
  price: z.number().nonnegative(),
});

export const foodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  price: z.number().positive("Price must be greater than 0"),
  categoryId: z.number().int("Category ID must be an integer"),
  image:z.string().url("Must be a valid URL").optional().or(z.literal("")),
  available: z.boolean(),
  prepTimeMinutes: z.number().int().nonnegative().default(15),
  options: z.array(foodOptionSchema).default([]),
});

export type FoodFormData = z.infer<typeof foodSchema>;