import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, orgProcedure, requirePermission } from "../trpc.js";
import { createAccountSchema, updateAccountSchema, reparentAccountSchema } from "@zoho-clone/shared/schemas";

export const accountsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.permissions, "accountant.view");
    return ctx.db.account.findMany({
      where: { organizationId: ctx.orgId },
      include: { children: { select: { id: true, code: true, name: true } } },
      orderBy: { code: "asc" },
    });
  }),

  tree: orgProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.permissions, "accountant.view");
    const accounts = await ctx.db.account.findMany({
      where: { organizationId: ctx.orgId, isActive: true },
      orderBy: { code: "asc" },
    });

    type AccountNode = (typeof accounts)[number] & { children: AccountNode[] };
    const map = new Map<string, AccountNode>();
    for (const a of accounts) map.set(a.id, { ...a, children: [] });

    const roots: AccountNode[] = [];
    for (const a of accounts) {
      if (a.parentId) {
        map.get(a.parentId)?.children.push(map.get(a.id)!);
      } else {
        roots.push(map.get(a.id)!);
      }
    }
    return roots;
  }),

  get: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.view");
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
        include: { parent: true, children: true },
      });
      if (!account) throw new TRPCError({ code: "NOT_FOUND" });
      return account;
    }),

  create: orgProcedure
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.create");

      if (input.parentId) {
        const parent = await ctx.db.account.findFirst({
          where: { id: input.parentId, organizationId: ctx.orgId },
        });
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent account not found" });
      }

      return ctx.db.account.create({
        data: {
          organizationId: ctx.orgId!,
          ...input,
        },
      });
    }),

  update: orgProcedure
    .input(updateAccountSchema.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.edit");
      const { id, ...data } = input;

      const account = await ctx.db.account.findFirst({ where: { id, organizationId: ctx.orgId } });
      if (!account) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.account.update({ where: { id }, data });
    }),

  archive: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.edit");
      const account = await ctx.db.account.findFirst({ where: { id: input.id, organizationId: ctx.orgId } });
      if (!account) throw new TRPCError({ code: "NOT_FOUND" });
      if (account.isSystem) throw new TRPCError({ code: "BAD_REQUEST", message: "System accounts cannot be archived" });

      const hasLines = await ctx.db.journalLine.count({ where: { accountId: input.id } });
      if (hasLines > 0) {
        return ctx.db.account.update({ where: { id: input.id }, data: { isActive: false } });
      }

      return ctx.db.account.update({ where: { id: input.id }, data: { isActive: false } });
    }),

  reparent: orgProcedure
    .input(reparentAccountSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.edit");

      // Circular reference check
      if (input.newParentId) {
        let cursor: string | null = input.newParentId;
        while (cursor) {
          if (cursor === input.accountId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Circular parent reference detected" });
          }
          const a = await ctx.db.account.findUnique({ where: { id: cursor }, select: { parentId: true } });
          cursor = a?.parentId ?? null;
        }
      }

      return ctx.db.account.update({
        where: { id: input.accountId },
        data: { parentId: input.newParentId },
      });
    }),
});
