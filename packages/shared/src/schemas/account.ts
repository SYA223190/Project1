import { z } from "zod";

export const AccountTypeEnum = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
]);

export const AccountSubtypeEnum = z.enum([
  "CASH_AND_BANK",
  "ACCOUNTS_RECEIVABLE",
  "OTHER_CURRENT_ASSET",
  "FIXED_ASSET",
  "OTHER_ASSET",
  "ACCOUNTS_PAYABLE",
  "CREDIT_CARD",
  "OTHER_CURRENT_LIABILITY",
  "LONG_TERM_LIABILITY",
  "EQUITY",
  "RETAINED_EARNINGS",
  "INCOME",
  "OTHER_INCOME",
  "COST_OF_GOODS_SOLD",
  "EXPENSE",
  "OTHER_EXPENSE",
]);

export const createAccountSchema = z.object({
  parentId: z.string().cuid().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(150),
  type: AccountTypeEnum,
  subtype: AccountSubtypeEnum,
  description: z.string().max(500).optional(),
  isBankAccount: z.boolean().default(false),
  currencyCode: z.string().length(3).default("USD"),
});

export const updateAccountSchema = createAccountSchema.partial();

export const reparentAccountSchema = z.object({
  accountId: z.string().cuid(),
  newParentId: z.string().cuid().nullable(),
});
