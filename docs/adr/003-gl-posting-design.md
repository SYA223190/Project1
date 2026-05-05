# ADR 003 — GL Posting Service Design

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** Foundation (Slice 1)

## Context

All money movements in the system must produce balanced double-entry GL journal entries.
The GL service is used by every financial module (invoices, bills, payments, expenses, etc.).

## Decision

### Architecture

The `GLService` class in `packages/core/src/gl/index.ts` is the single entry point for all journal writes:

1. **`post(input, txClient?)`** — validates balance + accounts, allocates entry number, writes `journal_entries` + `journal_lines` rows. Accepts an optional Prisma transaction client so callers can compose GL posting with their own DB writes atomically.

2. **`reverse(journalEntryId, ...)`** — creates a mirror entry with debits/credits swapped, links both entries via `reversedById` / `reversalOfId`.

3. **`trialBalance(orgId)`** — raw SQL aggregation over posted entries per account.

4. **`assertBalanced(orgId)`** — throws if `SUM(debit) != SUM(credit)` across all posted lines. Used in tests and post-seed validation.

### Invariants

- **Balance check:** `|totalDebit - totalCredit| ≤ 0.005` (half-cent tolerance for floating-point).
- **Account check:** every line's `accountId` must reference an active account in the same org.
- **Immutability:** posted entries cannot be updated or deleted. Corrections go through reversal.
- **Entry number:** allocated atomically via `numberSeries` row with `increment: 1` inside the same transaction.

### Audit log

The audit service is called by each tRPC mutation after the GL posts, not inside `GLService` itself. This keeps the core service free of HTTP context (userId, ip, userAgent).

## Alternatives Considered

- **Postgres triggers for audit:** rejected because Prisma does not surface trigger data easily; JS middleware gives better type safety and is testable.
- **Storing base amounts only:** rejected; keeping `amount_currency + fx_rate` on each line enables FX revaluation without re-fetching original documents.
- **Separate debit/credit columns vs. signed amount:** two columns (spec choice) avoids sign-convention errors and makes trial balance SQL trivial.

## Consequences

- All financial flows MUST go through `GLService.post()`. Direct `prisma.journalEntry.create()` calls are forbidden outside the GL service.
- `GLService` has zero HTTP dependency — it can be imported into BullMQ workers without Next.js context.
