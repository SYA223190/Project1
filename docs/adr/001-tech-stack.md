# ADR 001 — Technology Stack

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** Foundation (Slice 1)

## Context

Selecting a locked technology stack before any code is written, per build spec §0.

## Decision

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript | Single deployable, RSC for fast list views, App Router for nested layouts |
| UI | Tailwind + shadcn/ui + TanStack Table + React Hook Form + Zod | Production-grade patterns, zero design debt |
| API | tRPC v11 (over Next.js route handlers) | End-to-end type safety; eliminates manual OpenAPI plumbing |
| DB | PostgreSQL 16 + Prisma 5 | Relational integrity; JSON columns for flexible fields |
| Auth | Auth.js v5 (credentials + magic link) | Self-hosted, 2FA-ready, Prisma adapter |
| Jobs | BullMQ + Redis | Recurring invoices, scheduled reports, payment reminders |
| Files | Local FS (dev) → S3-compatible (prod) | Storage abstraction, no vendor lock-in |
| PDF | Puppeteer (HTML → PDF) | Pixel-perfect templates, handles complex tables |
| Mail | Nodemailer + MailHog (dev) | Pluggable to SES/Postmark/Resend in prod |
| Tests | Vitest + Playwright | Unit (domain services) + E2E (happy-path flows) |
| Monorepo | pnpm workspaces + Turborepo | Parallel builds, shared packages, caching |

## Consequences

- tRPC v11 RC: minor API surface may change but rc.446 is stable enough
- Prisma 5 generated client lives in `packages/db/generated` (not committed)
- All money stored as `Decimal(20,2)` in Postgres; computed in JS with rounding helpers
- Base currency locked per org after first transaction (enforced at API layer)
