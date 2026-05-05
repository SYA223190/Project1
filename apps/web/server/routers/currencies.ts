import { router, orgProcedure, requirePermission } from "../trpc.js";
import { upsertCurrencyRateSchema } from "@zoho-clone/shared/schemas";

export const currenciesRouter = router({
  listRates: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.currencyRate.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: [{ currencyCode: "asc" }, { date: "desc" }],
    });
  }),

  upsertRate: orgProcedure
    .input(upsertCurrencyRateSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.permissions, "accountant.edit");

      return ctx.db.currencyRate.upsert({
        where: {
          organizationId_currencyCode_date: {
            organizationId: ctx.orgId!,
            currencyCode: input.currencyCode,
            date: input.date,
          },
        },
        update: { rateToBase: input.rateToBase, source: "manual" },
        create: {
          organizationId: ctx.orgId!,
          currencyCode: input.currencyCode,
          date: input.date,
          rateToBase: input.rateToBase,
          source: "manual",
        },
      });
    }),

  fetchToday: orgProcedure.mutation(async ({ ctx }) => {
    requirePermission(ctx.permissions, "accountant.edit");
    // Stub: in production, call exchangerate.host API
    // For now, ensure USD=1 exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await ctx.db.currencyRate.upsert({
      where: {
        organizationId_currencyCode_date: {
          organizationId: ctx.orgId!,
          currencyCode: "USD",
          date: today,
        },
      },
      update: {},
      create: {
        organizationId: ctx.orgId!,
        currencyCode: "USD",
        date: today,
        rateToBase: 1.0,
        source: "system",
      },
    });

    return { updated: ["USD"], date: today };
  }),
});
