import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, orgProcedure, requirePermission } from "../trpc.js";
import { createTaxSchema, updateTaxSchema, createTaxGroupSchema } from "@zoho-clone/shared/schemas";

export const taxesRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.tax.findMany({
      where: { organizationId: ctx.orgId },
      include: { taxGroupMembers: { include: { taxGroup: true } } },
      orderBy: { code: "asc" },
    });
  }),

  listGroups: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.taxGroup.findMany({
      where: { organizationId: ctx.orgId },
      include: { members: { include: { tax: true }, orderBy: { order: "asc" } } },
    });
  }),

  create: orgProcedure
    .input(createTaxSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.create");
      return ctx.db.tax.create({
        data: {
          organizationId: ctx.orgId!,
          code: input.code,
          name: input.name,
          rate: input.rate,
          isCompound: input.isCompound ?? false,
          parentTaxId: input.parentTaxId,
          authority: input.authority,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
          payableAccountId: input.payableAccountId,
          receivableAccountId: input.receivableAccountId,
        },
      });
    }),

  update: orgProcedure
    .input(updateTaxSchema.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.edit");
      const { id, ...data } = input;

      const tax = await ctx.db.tax.findFirst({ where: { id, organizationId: ctx.orgId } });
      if (!tax) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.tax.update({ where: { id }, data });
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.delete");
      const tax = await ctx.db.tax.findFirst({ where: { id: input.id, organizationId: ctx.orgId } });
      if (!tax) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.tax.update({ where: { id: input.id }, data: { isActive: false } });
      return { archived: true };
    }),

  createGroup: orgProcedure
    .input(createTaxGroupSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.create");

      return ctx.db.$transaction(async (tx) => {
        const group = await tx.taxGroup.create({
          data: { organizationId: ctx.orgId!, name: input.name },
        });
        await tx.taxGroupMember.createMany({
          data: input.memberTaxIds.map((taxId, idx) => ({
            taxGroupId: group.id,
            taxId,
            order: idx,
          })),
        });
        return group;
      });
    }),
});
