import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  baseCurrency: z.string().length(3).default("USD"),
  country: z.string().length(2).default("US"),
  fiscalYearStart: z.number().int().min(1).max(12).default(1),
  timezone: z.string().default("America/New_York"),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  taxNumber: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export const updateOrgSchema = createOrgSchema.partial().omit({ slug: true, baseCurrency: true });

export const inviteUserSchema = z.object({
  email: z.string().email(),
  roleId: z.string().cuid(),
});
