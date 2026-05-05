/**
 * Audit Log Service
 *
 * Records every create/update/delete on audited entities.
 * Computes a diff of changed fields between before/after snapshots.
 * Rows are never deleted (retention: forever).
 */

import type { PrismaClient } from "@zoho-clone/db/client";
import type { AuditAction, AuditEntityType } from "@zoho-clone/shared/types";

export type { AuditAction, AuditEntityType };

export interface AuditContext {
  organizationId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditInput {
  ctx: AuditContext;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Compute a shallow diff between two objects.
 * Returns only the keys that changed, with { before, after } values.
 */
function computeDiff(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): Record<string, { before: unknown; after: unknown }> | null {
  if (!before && !after) return null;
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const key of allKeys) {
    const bVal = before?.[key];
    const aVal = after?.[key];
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diff[key] = { before: bVal, after: aVal };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

export class AuditService {
  constructor(private readonly db: PrismaClient) {}

  async log(input: AuditInput): Promise<void> {
    const diff = computeDiff(input.before, input.after);
    await this.db.auditLog.create({
      data: {
        organizationId: input.ctx.organizationId,
        userId: input.ctx.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        before: input.before ?? null,
        after: input.after ?? null,
        diff: diff ?? undefined,
        ip: input.ctx.ip ?? null,
        userAgent: input.ctx.userAgent ?? null,
      },
    });
  }

  async listByRecord(
    organizationId: string,
    entityType: AuditEntityType,
    entityId: string
  ) {
    return this.db.auditLog.findMany({
      where: { organizationId, entityType, entityId },
      orderBy: { occurredAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listByOrg(
    organizationId: string,
    opts: { page?: number; pageSize?: number } = {}
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where: { organizationId },
        orderBy: { occurredAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.db.auditLog.count({ where: { organizationId } }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
