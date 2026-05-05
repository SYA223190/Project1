import { z } from "zod";

export const createTaxSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  rate: z.number().min(0).max(1, "Rate must be a decimal between 0 and 1"),
  isCompound: z.boolean().default(false),
  parentTaxId: z.string().cuid().optional(),
  authority: z.string().max(100).optional(),
  effectiveFrom: z.coerce.date().default(() => new Date()),
  effectiveTo: z.coerce.date().optional(),
  payableAccountId: z.string().cuid().optional(),
  receivableAccountId: z.string().cuid().optional(),
});

export const updateTaxSchema = createTaxSchema.partial();

export const createTaxGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberTaxIds: z.array(z.string().cuid()).min(1),
});
