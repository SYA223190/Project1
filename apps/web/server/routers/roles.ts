import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, orgProcedure, requirePermission } from "../trpc.js";
import { createRoleSchema, updateRoleSchema, cloneRoleSchema } from "@zoho-clone/shared/schemas";

export const rolesRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.permissions, "roles.view");
    return ctx.db.role.findMany({ where: { organizationId: ctx.orgId } });
  }),

  create: orgProcedure
    .input(createRoleSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "roles.create");
      return ctx.db.role.create({
        data: {
          organizationId: ctx.orgId,
          name: input.name,
          description: input.description,
          permissions: input.permissions,
        },
      });
    }),

  update: orgProcedure
    .input(updateRoleSchema.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "roles.edit");
      const { id, ...data } = input;

      const role = await ctx.db.role.findFirst({ where: { id, organizationId: ctx.orgId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.isSystem) throw new TRPCError({ code: "BAD_REQUEST", message: "System roles cannot be modified" });

      return ctx.db.role.update({ where: { id }, data });
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "roles.delete");
      const role = await ctx.db.role.findFirst({ where: { id: input.id, organizationId: ctx.orgId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.isSystem) throw new TRPCError({ code: "BAD_REQUEST", message: "System roles cannot be deleted" });

      const membersUsingRole = await ctx.db.organizationMember.count({ where: { roleId: input.id } });
      if (membersUsingRole > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Role is in use by members" });
      }

      await ctx.db.role.delete({ where: { id: input.id } });
      return { deleted: true };
    }),

  clone: orgProcedure
    .input(cloneRoleSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "roles.create");
      const source = await ctx.db.role.findFirst({ where: { id: input.sourceRoleId, organizationId: ctx.orgId } });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.role.create({
        data: {
          organizationId: ctx.orgId,
          name: input.name,
          description: `Cloned from ${source.name}`,
          permissions: source.permissions as object,
        },
      });
    }),

  listPermissions: orgProcedure.query(() => {
    const MODULES = [
      "sales", "purchases", "customers", "vendors", "items", "expenses",
      "banking", "reports", "projects", "timeEntries", "org", "users", "roles",
      "accountant", "documents", "automation",
    ];
    const ACTIONS = ["view", "create", "edit", "delete", "send", "approve", "post", "void"];
    return MODULES.flatMap((m) => ACTIONS.map((a) => `${m}.${a}`));
  }),
});
