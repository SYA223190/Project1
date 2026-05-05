import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, orgProcedure, requirePermission } from "../trpc.js";
import { createManualJournalSchema, updateManualJournalSchema, reverseJournalSchema } from "@zoho-clone/shared/schemas";

export const manualJournalsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.permissions, "accountant.view");
    return ctx.db.manualJournal.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { date: "desc" },
    });
  }),

  get: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.view");
      const mj = await ctx.db.manualJournal.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!mj) throw new TRPCError({ code: "NOT_FOUND" });
      return mj;
    }),

  create: orgProcedure
    .input(createManualJournalSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.create");
      const number = await ctx.numbering.next(ctx.orgId!, "manual_journal");

      return ctx.db.manualJournal.create({
        data: {
          organizationId: ctx.orgId!,
          number,
          date: input.date,
          notes: input.notes,
          reference: input.reference,
          currencyCode: input.currencyCode ?? "USD",
          status: "DRAFT",
          lines: input.lines as object[],
        },
      });
    }),

  update: orgProcedure
    .input(updateManualJournalSchema.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.edit");
      const { id, ...data } = input;

      const mj = await ctx.db.manualJournal.findFirst({ where: { id, organizationId: ctx.orgId } });
      if (!mj) throw new TRPCError({ code: "NOT_FOUND" });
      if (mj.status === "POSTED") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit a posted journal" });

      return ctx.db.manualJournal.update({
        where: { id },
        data: {
          date: data.date,
          notes: data.notes,
          reference: data.reference,
          currencyCode: data.currencyCode,
          lines: data.lines as object[],
        },
      });
    }),

  post: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.post");

      const mj = await ctx.db.manualJournal.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!mj) throw new TRPCError({ code: "NOT_FOUND" });
      if (mj.status !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Journal is not in Draft state" });

      const lines = mj.lines as Array<{
        accountId: string;
        description?: string;
        debit: number;
        credit: number;
        currencyCode?: string;
        fxRate?: number;
        order?: number;
      }>;

      const posted = await ctx.gl.post({
        organizationId: ctx.orgId!,
        date: mj.date,
        description: mj.notes ?? undefined,
        reference: mj.reference ?? undefined,
        sourceType: "manual_journal",
        sourceId: mj.id,
        currencyCode: mj.currencyCode,
        lines,
      });

      const updated = await ctx.db.manualJournal.update({
        where: { id: input.id },
        data: { status: "POSTED", journalEntryId: posted.id },
      });

      await ctx.audit.log({
        ctx: { organizationId: ctx.orgId!, userId: ctx.userId, ip: ctx.ip, userAgent: ctx.userAgent },
        entityType: "manual_journal",
        entityId: input.id,
        action: "post",
        after: { entryNumber: posted.entryNumber },
      });

      return updated;
    }),

  void: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.void");

      const mj = await ctx.db.manualJournal.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!mj) throw new TRPCError({ code: "NOT_FOUND" });

      if (mj.status === "DRAFT") {
        return ctx.db.manualJournal.update({ where: { id: input.id }, data: { status: "VOID" } });
      }

      if (mj.status === "POSTED" && mj.journalEntryId) {
        await ctx.gl.reverse(
          mj.journalEntryId,
          ctx.orgId!,
          new Date(),
          `Void of ${mj.number}`
        );
      }

      return ctx.db.manualJournal.update({ where: { id: input.id }, data: { status: "VOID" } });
    }),
});
