import { z } from "zod";
import { router, orgProcedure, requirePermission } from "../trpc.js";

export const auditLogRouter = router({
  list: orgProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "org.view");
      return ctx.audit.listByOrg(ctx.orgId!, { page: input.page, pageSize: input.pageSize });
    }),

  byRecord: orgProcedure
    .input(z.object({ entityType: z.string(), entityId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.audit.listByRecord(
        ctx.orgId!,
        input.entityType as Parameters<typeof ctx.audit.listByRecord>[1],
        input.entityId
      );
    }),
});
