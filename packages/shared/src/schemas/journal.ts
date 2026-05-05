import { z } from "zod";

export const journalLineInputSchema = z.object({
  accountId: z.string().cuid(),
  description: z.string().max(500).optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  currencyCode: z.string().length(3).default("USD"),
  fxRate: z.number().positive().default(1),
  order: z.number().int().default(0),
});

export const createManualJournalSchema = z.object({
  date: z.coerce.date(),
  notes: z.string().max(1000).optional(),
  reference: z.string().max(100).optional(),
  currencyCode: z.string().length(3).default("USD"),
  lines: z
    .array(journalLineInputSchema)
    .min(2, "At least 2 lines required")
    .refine(
      (lines) => {
        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
      },
      { message: "Debits must equal credits" }
    ),
});

export const updateManualJournalSchema = createManualJournalSchema;

export const postManualJournalSchema = z.object({
  id: z.string().cuid(),
});

export const reverseJournalSchema = z.object({
  id: z.string().cuid(),
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
});
