import { describe, it, expect, vi, beforeEach } from "vitest";
import { GLService, GLError } from "../gl/index.js";
import type { PrismaClient } from "@zoho-clone/db/client";

// Minimal mock of PrismaClient for GL tests
function makePrismaMock(overrides: Partial<{
  accountFindMany: unknown;
  numberSeriesUpdate: unknown;
  journalEntryCreate: unknown;
  journalEntryFindFirst: unknown;
  journalEntryUpdate: unknown;
  transactionFn: ((fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>) | null;
}> = {}) {
  const defaultTransaction = overrides.transactionFn !== undefined
    ? overrides.transactionFn
    : (fn: (tx: unknown) => Promise<unknown>) => fn(mock);

  const mock = {
    account: {
      findMany: vi.fn().mockResolvedValue(
        overrides.accountFindMany ?? [
          { id: "acc-1" },
          { id: "acc-2" },
        ]
      ),
    },
    numberSeries: {
      update: vi.fn().mockResolvedValue(
        overrides.numberSeriesUpdate ?? {
          nextNumber: 2,
          prefix: "JNL-",
          padLength: 5,
        }
      ),
    },
    journalEntry: {
      create: vi.fn().mockResolvedValue(
        overrides.journalEntryCreate ?? {
          id: "je-1",
          entryNumber: "JNL-00001",
          date: new Date("2024-01-15"),
          description: "Test entry",
          lines: [
            { id: "l1", debit: "500.00", credit: "0.00", accountId: "acc-1", currencyCode: "USD", fxRate: "1", order: 0, description: null },
            { id: "l2", debit: "0.00", credit: "500.00", accountId: "acc-2", currencyCode: "USD", fxRate: "1", order: 1, description: null },
          ],
        }
      ),
      findFirst: vi.fn().mockResolvedValue(overrides.journalEntryFindFirst ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: defaultTransaction ?? vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mock)),
    $queryRaw: vi.fn().mockResolvedValue([]),
  } as unknown as PrismaClient;

  return mock;
}

describe("GLService.validateBalance", () => {
  it("passes when debits == credits", () => {
    const gl = new GLService(makePrismaMock());
    expect(() =>
      gl.validateBalance([
        { accountId: "a", debit: 500, credit: 0 },
        { accountId: "b", debit: 0, credit: 500 },
      ])
    ).not.toThrow();
  });

  it("throws GLError when debits != credits", () => {
    const gl = new GLService(makePrismaMock());
    expect(() =>
      gl.validateBalance([
        { accountId: "a", debit: 500, credit: 0 },
        { accountId: "b", debit: 0, credit: 400 },
      ])
    ).toThrow(GLError);
  });

  it("passes within 0.005 rounding tolerance", () => {
    const gl = new GLService(makePrismaMock());
    expect(() =>
      gl.validateBalance([
        { accountId: "a", debit: 100.004, credit: 0 },
        { accountId: "b", debit: 0, credit: 100.00 },
      ])
    ).not.toThrow();
  });

  it("throws when out of balance by more than 0.005", () => {
    const gl = new GLService(makePrismaMock());
    expect(() =>
      gl.validateBalance([
        { accountId: "a", debit: 100.01, credit: 0 },
        { accountId: "b", debit: 0, credit: 100.00 },
      ])
    ).toThrow(GLError);
  });

  it("handles multi-line entries", () => {
    const gl = new GLService(makePrismaMock());
    expect(() =>
      gl.validateBalance([
        { accountId: "a", debit: 300, credit: 0 },
        { accountId: "b", debit: 200, credit: 0 },
        { accountId: "c", debit: 0, credit: 500 },
      ])
    ).not.toThrow();
  });
});

describe("GLService.validateAccounts", () => {
  it("passes when all accounts exist and are active", async () => {
    const gl = new GLService(
      makePrismaMock({ accountFindMany: [{ id: "acc-1" }, { id: "acc-2" }] })
    );
    await expect(
      gl.validateAccounts("org-1", [
        { accountId: "acc-1", debit: 100, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 100 },
      ])
    ).resolves.not.toThrow();
  });

  it("throws when an account is missing", async () => {
    const gl = new GLService(makePrismaMock({ accountFindMany: [{ id: "acc-1" }] }));
    await expect(
      gl.validateAccounts("org-1", [
        { accountId: "acc-1", debit: 100, credit: 0 },
        { accountId: "acc-MISSING", debit: 0, credit: 100 },
      ])
    ).rejects.toThrow(GLError);
  });

  it("deduplicates account IDs before querying", async () => {
    const mock = makePrismaMock({ accountFindMany: [{ id: "acc-1" }] });
    const gl = new GLService(mock);
    await gl.validateAccounts("org-1", [
      { accountId: "acc-1", debit: 50, credit: 0 },
      { accountId: "acc-1", debit: 50, credit: 0 },
      { accountId: "acc-1", debit: 0, credit: 100 },
    ]);
    // findMany called once with a single id
    expect(mock.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["acc-1"] } }) })
    );
  });
});

describe("GLService.post", () => {
  it("returns a PostedJournalEntry on success", async () => {
    const gl = new GLService(makePrismaMock());
    const result = await gl.post({
      organizationId: "org-1",
      date: new Date("2024-01-15"),
      description: "Test",
      lines: [
        { accountId: "acc-1", debit: 500, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 500 },
      ],
    });

    expect(result.entryNumber).toBe("JNL-00001");
    expect(result.totalDebit).toBe(500);
    expect(result.totalCredit).toBe(500);
    expect(result.lineCount).toBe(2);
  });

  it("throws when lines are unbalanced", async () => {
    const gl = new GLService(makePrismaMock());
    await expect(
      gl.post({
        organizationId: "org-1",
        date: new Date("2024-01-15"),
        lines: [
          { accountId: "acc-1", debit: 500, credit: 0 },
          { accountId: "acc-2", debit: 0, credit: 400 },
        ],
      })
    ).rejects.toThrow(GLError);
  });
});

describe("GLService.reverse", () => {
  it("throws when original entry is not found", async () => {
    const gl = new GLService(makePrismaMock({ journalEntryFindFirst: null }));
    await expect(
      gl.reverse("je-not-found", "org-1", new Date())
    ).rejects.toThrow(GLError);
  });

  it("throws when entry has already been reversed", async () => {
    const gl = new GLService(
      makePrismaMock({
        journalEntryFindFirst: {
          id: "je-1",
          organizationId: "org-1",
          status: "POSTED",
          reversedById: "je-reversal",
          entryNumber: "JNL-00001",
          currencyCode: "USD",
          lines: [
            { accountId: "acc-1", debit: "500", credit: "0", description: null, currencyCode: "USD", fxRate: "1", order: 0 },
            { accountId: "acc-2", debit: "0", credit: "500", description: null, currencyCode: "USD", fxRate: "1", order: 1 },
          ],
        },
      })
    );
    await expect(gl.reverse("je-1", "org-1", new Date())).rejects.toThrow(GLError);
  });
});

describe("GLService.trialBalance", () => {
  it("returns empty array when no journal lines exist", async () => {
    const gl = new GLService(makePrismaMock());
    const tb = await gl.trialBalance("org-1");
    expect(tb).toEqual([]);
  });
});
