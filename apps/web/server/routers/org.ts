import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, orgProcedure, requirePermission } from "../trpc.js";
import { createOrgSchema, updateOrgSchema, inviteUserSchema } from "@zoho-clone/shared/schemas";
import { randomBytes } from "crypto";

const US_COA_SEED = [
  { code: "1000", name: "Cash and Cash Equivalents", type: "ASSET" as const, subtype: "CASH_AND_BANK" as const, isSystem: true },
  { code: "1010", name: "Checking Account", type: "ASSET" as const, subtype: "CASH_AND_BANK" as const, isBankAccount: true, parentCode: "1000" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" as const, subtype: "ACCOUNTS_RECEIVABLE" as const, isSystem: true },
  { code: "2100", name: "Accounts Payable", type: "LIABILITY" as const, subtype: "ACCOUNTS_PAYABLE" as const, isSystem: true },
  { code: "2300", name: "Sales Tax Payable", type: "LIABILITY" as const, subtype: "OTHER_CURRENT_LIABILITY" as const, isSystem: true },
  { code: "3300", name: "Retained Earnings", type: "EQUITY" as const, subtype: "RETAINED_EARNINGS" as const, isSystem: true },
  { code: "4100", name: "Sales Revenue", type: "INCOME" as const, subtype: "INCOME" as const, isSystem: true },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const, subtype: "COST_OF_GOODS_SOLD" as const, isSystem: true },
  { code: "4320", name: "Realized FX Gain", type: "INCOME" as const, subtype: "OTHER_INCOME" as const, isSystem: true },
  { code: "7200", name: "Realized FX Loss", type: "EXPENSE" as const, subtype: "OTHER_EXPENSE" as const, isSystem: true },
];

const NUMBER_SERIES = [
  { module: "invoice", prefix: "INV-" },
  { module: "quote", prefix: "QTE-" },
  { module: "sales_order", prefix: "SO-" },
  { module: "delivery_note", prefix: "DN-" },
  { module: "credit_note", prefix: "CN-" },
  { module: "payment_received", prefix: "PR-" },
  { module: "purchase_order", prefix: "PO-" },
  { module: "bill", prefix: "BILL-" },
  { module: "vendor_credit", prefix: "VC-" },
  { module: "payment_made", prefix: "PM-" },
  { module: "expense", prefix: "EXP-" },
  { module: "journal", prefix: "JNL-" },
  { module: "manual_journal", prefix: "MJ-" },
];

const DEFAULT_ROLES = [
  { name: "Admin", permissions: { "*.*": true }, isSystem: true },
  {
    name: "Staff",
    isSystem: true,
    permissions: Object.fromEntries([
      ...["sales", "purchases", "customers", "vendors", "items", "expenses"].flatMap((m) =>
        ["view", "create", "edit", "send"].map((a) => [`${m}.${a}`, true])
      ),
      ...["banking", "reports"].flatMap((m) =>
        ["view", "create"].map((a) => [`${m}.${a}`, true])
      ),
    ]),
  },
];

export const orgRouter = router({
  create: protectedProcedure
    .input(createOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.organization.findUnique({ where: { slug: input.slug } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This slug is already taken" });
      }

      return ctx.db.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.slug,
            baseCurrency: input.baseCurrency ?? "USD",
            country: input.country ?? "US",
            fiscalYearStart: input.fiscalYearStart ?? 1,
            timezone: input.timezone ?? "America/New_York",
            phone: input.phone,
            website: input.website,
            taxNumber: input.taxNumber,
            address: input.address as object,
          },
        });

        // Seed roles
        const adminRole = await tx.role.create({
          data: {
            organizationId: org.id,
            name: "Admin",
            permissions: { "*.*": true },
            isSystem: true,
          },
        });
        for (const r of DEFAULT_ROLES.slice(1)) {
          await tx.role.create({
            data: { organizationId: org.id, ...r },
          });
        }

        // Add creator as admin owner
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: ctx.userId!,
            roleId: adminRole.id,
            isOwner: true,
            joinedAt: new Date(),
          },
        });

        // Seed minimal CoA
        const codeToId: Record<string, string> = {};
        for (const acct of US_COA_SEED.filter((a) => !a.parentCode)) {
          const created = await tx.account.create({
            data: {
              organizationId: org.id,
              code: acct.code,
              name: acct.name,
              type: acct.type,
              subtype: acct.subtype,
              isSystem: acct.isSystem ?? false,
              isBankAccount: (acct as { isBankAccount?: boolean }).isBankAccount ?? false,
            },
          });
          codeToId[acct.code] = created.id;
        }
        for (const acct of US_COA_SEED.filter((a) => a.parentCode)) {
          const created = await tx.account.create({
            data: {
              organizationId: org.id,
              parentId: codeToId[(acct as { parentCode?: string }).parentCode!],
              code: acct.code,
              name: acct.name,
              type: acct.type,
              subtype: acct.subtype,
              isSystem: acct.isSystem ?? false,
              isBankAccount: (acct as { isBankAccount?: boolean }).isBankAccount ?? false,
            },
          });
          codeToId[acct.code] = created.id;
        }

        // Seed number series
        await tx.numberSeries.createMany({
          data: NUMBER_SERIES.map((s) => ({
            organizationId: org.id,
            module: s.module,
            prefix: s.prefix,
            nextNumber: 1,
            padLength: 5,
          })),
        });

        // Seed USD rate
        await tx.currencyRate.create({
          data: {
            organizationId: org.id,
            currencyCode: "USD",
            date: new Date(),
            rateToBase: 1.0,
            source: "system",
          },
        });

        return org;
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.organizationMember.findMany({
      where: { userId: ctx.userId! },
      include: {
        organization: true,
        role: { select: { name: true } },
      },
    });
    return memberships;
  }),

  get: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
    });
  }),

  update: orgProcedure
    .input(updateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "org.edit");

      const org = await ctx.db.organization.findUniqueOrThrow({ where: { id: ctx.orgId } });

      if (org.firstTransactionAt && input.baseCurrency !== undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Base currency cannot be changed after the first transaction",
        });
      }

      const updated = await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          name: input.name,
          country: input.country,
          fiscalYearStart: input.fiscalYearStart,
          timezone: input.timezone,
          phone: input.phone,
          website: input.website,
          taxNumber: input.taxNumber,
          address: input.address as object,
        },
      });

      await ctx.audit.log({
        ctx: { organizationId: ctx.orgId!, userId: ctx.userId, ip: ctx.ip, userAgent: ctx.userAgent },
        entityType: "organization",
        entityId: ctx.orgId!,
        action: "update",
        before: org,
        after: updated,
      });

      return updated;
    }),

  inviteUser: orgProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "users.create");

      const role = await ctx.db.role.findFirst({
        where: { id: input.roleId, organizationId: ctx.orgId },
      });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });

      const existingUser = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (existingUser) {
        const existingMember = await ctx.db.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: ctx.orgId!, userId: existingUser.id } },
        });
        if (existingMember) {
          throw new TRPCError({ code: "CONFLICT", message: "User is already a member" });
        }
      }

      const inviteToken = randomBytes(32).toString("hex");
      await ctx.db.organizationMember.create({
        data: {
          organizationId: ctx.orgId!,
          userId: existingUser?.id ?? ctx.userId!,
          roleId: input.roleId,
          inviteToken,
          inviteEmail: input.email,
        },
      });

      // TODO: send invitation email via nodemailer
      console.log(`Invite token for ${input.email}: ${inviteToken}`);

      return { invited: true, email: input.email };
    }),

  removeUser: orgProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "users.delete");

      const member = await ctx.db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: ctx.orgId!, userId: input.userId } },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (member.isOwner) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove the org owner" });

      await ctx.db.organizationMember.delete({
        where: { organizationId_userId: { organizationId: ctx.orgId!, userId: input.userId } },
      });

      return { removed: true };
    }),
});
