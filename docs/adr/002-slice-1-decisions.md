# ADR 002 — Slice 1 Open Question Resolutions

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** Foundation (Slice 1)

## Context

Build spec §12 required human review of 5 open questions before slice 1 code was written.
All answers were provided by the product owner on 2026-05-05.

## Decisions

### Q1 — Chart of Accounts Country Presets

**Decision:** US only in Slice 1.  
**Rationale:** Keeps seed lean. UK/IN/AE will be added as data-only PRs in later slices.  
**Impact:** `prisma/seed.ts` seeds 60+ US accounts. Org creation auto-seeds the same set.

### Q2 — Decimal Precision

**Decision:** USD only; fixed 2 decimal places.  
**Rationale:** Scope is USD-only for now. All `Decimal` columns are `Decimal(20,2)`.  
**Impact:** `organization.decimalPlaces` defaults to 2. `roundMoney()` helper uses 2 places. No per-currency precision table needed.

### Q3 — Manual Journal Draft State

**Decision:** Manual Journal DOES have a Draft state.  
**Rationale:** Allows users to prepare journals for review before posting.  
**Impact:** `ManualJournal.status` enum includes `DRAFT | POSTED | VOID`. Posting requires explicit `manualJournals.post` mutation. Posted journals are immutable (void by reversal only).

### Q4 — Customer Portal Scope

**Decision:** Invoice view + full account statement.  
**Rationale:** Broader portal is more useful without significant extra complexity.  
**Impact:** Customer portal returns both individual invoice detail and a running statement of account. Accessed via signed URL token stored in `Customer.portalToken`.

### Q5 — Workflow Rule "Create Task" Action

**Decision:** Include "Create Task" action.  
**Rationale:** Tasks are a lightweight cross-cutting model, not a full module.  
**Impact:** `Task` model added to Prisma schema with minimal fields. Workflow engine can create tasks as an action. No separate Tasks UI in Slice 1 — tasks surfaced only in record detail panels.

## Consequences

- Manual journal workflow: Draft → (edit freely) → Post → (immutable; void by reversal)
- Base currency lock: enforced in `org.update` tRPC mutation; checked against `firstTransactionAt`
- Task model is intentionally minimal; no task comments, attachments, or subtasks in Phase 1
