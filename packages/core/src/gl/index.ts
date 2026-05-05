/**
 * GL Posting Service
 *
 * Central authority for creating and posting journal entries.
 * Enforces: debits == credits, all lines reference valid accounts,
 * entry number uniqueness, immutability of posted entries.
 */

import type { PrismaClient } from "@zoho-clone/db/client";
import type { JournalLineInput, PostJournalInput } from "@zoho-clone/shared/types";
import { roundMoney } from "@zoho-clone/shared/types";

export class GLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GLError";
  }
}

export interface PostedJournalEntry {
  id: string;
  entryNumber: string;
  date: Date;
  description: string | null;
  totalDebit: number;
  totalCredit: number;
  lineCount: number;
}

export class GLService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Validate that debits equal credits (within rounding tolerance of 1 cent).
   */
  validateBalance(lines: JournalLineInput[]): void {
    const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    const delta = Math.abs(totalDebit - totalCredit);
    if (delta > 0.005) {
      throw new GLError(
        `Journal is out of balance: debits=${totalDebit.toFixed(2)}, credits=${totalCredit.toFixed(2)}, delta=${delta.toFixed(4)}`
      );
    }
  }

  /**
   * Validate that each line references an active account in the same org.
   */
  async validateAccounts(
    organizationId: string,
    lines: JournalLineInput[]
  ): Promise<void> {
    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await this.db.account.findMany({
      where: { id: { in: accountIds }, organizationId, isActive: true },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      const found = new Set(accounts.map((a) => a.id));
      const missing = accountIds.filter((id) => !found.has(id));
      throw new GLError(`Invalid or inactive accounts: ${missing.join(", ")}`);
    }
  }

  /**
   * Allocate the next journal entry number for an organization.
   * Uses the number_series table with an atomic increment.
   */
  async nextEntryNumber(organizationId: string, tx: PrismaClient): Promise<string> {
    const series = await tx.numberSeries.update({
      where: { organizationId_module: { organizationId, module: "journal" } },
      data: { nextNumber: { increment: 1 } },
    });
    const num = (series.nextNumber - 1).toString().padStart(series.padLength, "0");
    return `${series.prefix}${num}`;
  }

  /**
   * Post a journal entry. Validates balance and accounts, then writes
   * journal_entry + journal_line rows in a transaction.
   *
   * Returns immediately — caller may pass an existing Prisma transaction client
   * so this can be composed with other operations (e.g. creating an invoice).
   */
  async post(
    input: PostJournalInput,
    txClient?: PrismaClient
  ): Promise<PostedJournalEntry> {
    const execute = async (tx: PrismaClient): Promise<PostedJournalEntry> => {
      this.validateBalance(input.lines);
      await this.validateAccounts(input.organizationId, input.lines);

      const entryNumber = await this.nextEntryNumber(input.organizationId, tx);

      const entry = await tx.journalEntry.create({
        data: {
          organizationId: input.organizationId,
          entryNumber,
          date: input.date,
          description: input.description ?? null,
          reference: input.reference ?? null,
          status: "POSTED",
          currencyCode: input.currencyCode ?? "USD",
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          postedAt: new Date(),
          lines: {
            create: input.lines.map((l, idx) => ({
              accountId: l.accountId,
              description: l.description ?? null,
              debit: roundMoney(l.debit ?? 0),
              credit: roundMoney(l.credit ?? 0),
              currencyCode: l.currencyCode ?? input.currencyCode ?? "USD",
              fxRate: l.fxRate ?? 1,
              amountBase: roundMoney((l.debit ?? 0) - (l.credit ?? 0)),
              order: l.order ?? idx,
            })),
          },
        },
        include: { lines: true },
      });

      const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);

      return {
        id: entry.id,
        entryNumber: entry.entryNumber,
        date: entry.date,
        description: entry.description,
        totalDebit,
        totalCredit,
        lineCount: entry.lines.length,
      };
    };

    if (txClient) {
      return execute(txClient);
    }

    return this.db.$transaction((tx) => execute(tx as unknown as PrismaClient));
  }

  /**
   * Reverse a posted journal entry. Creates a mirror entry with all
   * debits/credits swapped, links both entries.
   */
  async reverse(
    journalEntryId: string,
    organizationId: string,
    date: Date,
    description?: string
  ): Promise<PostedJournalEntry> {
    const original = await this.db.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId, status: "POSTED" },
      include: { lines: true },
    });

    if (!original) {
      throw new GLError(`Journal entry ${journalEntryId} not found or not posted`);
    }
    if (original.reversedById) {
      throw new GLError(`Journal entry ${journalEntryId} has already been reversed`);
    }

    const reversalLines: JournalLineInput[] = original.lines.map((l) => ({
      accountId: l.accountId,
      description: l.description ?? undefined,
      debit: Number(l.credit),
      credit: Number(l.debit),
      currencyCode: l.currencyCode,
      fxRate: Number(l.fxRate),
      order: l.order,
    }));

    return this.db.$transaction(async (tx) => {
      const reversal = await this.post(
        {
          organizationId,
          date,
          description: description ?? `Reversal of ${original.entryNumber}`,
          sourceType: "reversal",
          sourceId: original.id,
          currencyCode: original.currencyCode,
          lines: reversalLines,
        },
        tx as unknown as PrismaClient
      );

      await (tx as unknown as PrismaClient).journalEntry.update({
        where: { id: original.id },
        data: { reversedById: reversal.id },
      });

      return reversal;
    });
  }

  /**
   * Read the current trial balance for an organization.
   * Returns debits, credits, and net per account, in base currency.
   */
  async trialBalance(organizationId: string): Promise<
    Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      totalDebit: number;
      totalCredit: number;
      net: number;
    }>
  > {
    const rows = await this.db.$queryRaw<
      Array<{
        account_id: string;
        account_code: string;
        account_name: string;
        account_type: string;
        total_debit: string;
        total_credit: string;
      }>
    >`
      SELECT
        a.id              AS account_id,
        a.code            AS account_code,
        a.name            AS account_name,
        a.type            AS account_type,
        COALESCE(SUM(jl.debit), 0)  AS total_debit,
        COALESCE(SUM(jl.credit), 0) AS total_credit
      FROM accounts a
      LEFT JOIN journal_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
        AND je.status = 'POSTED'
        AND je.organization_id = ${organizationId}
      WHERE a.organization_id = ${organizationId}
        AND a.is_active = true
      GROUP BY a.id, a.code, a.name, a.type
      ORDER BY a.code
    `;

    return rows.map((r) => {
      const debit = Number(r.total_debit);
      const credit = Number(r.total_credit);
      return {
        accountId: r.account_id,
        accountCode: r.account_code,
        accountName: r.account_name,
        accountType: r.account_type,
        totalDebit: debit,
        totalCredit: credit,
        net: debit - credit,
      };
    });
  }

  /**
   * Assert the trial balance is in balance (total debits == total credits).
   * Used in tests and post-seed validation.
   */
  async assertBalanced(organizationId: string): Promise<void> {
    const tb = await this.trialBalance(organizationId);
    const totalDebit = tb.reduce((s, r) => s + r.totalDebit, 0);
    const totalCredit = tb.reduce((s, r) => s + r.totalCredit, 0);
    const delta = Math.abs(totalDebit - totalCredit);
    if (delta > 0.01) {
      throw new GLError(
        `Trial balance is out of balance: debits=${totalDebit.toFixed(2)}, credits=${totalCredit.toFixed(2)}`
      );
    }
  }
}
