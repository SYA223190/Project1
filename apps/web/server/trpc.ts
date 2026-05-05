import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id } });
});

export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const orgId = ctx.orgId;
  if (!orgId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Organization context required" });
  }

  const member = await ctx.db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: ctx.userId! } },
    include: { role: true, organization: true },
  });

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  }

  return next({
    ctx: {
      ...ctx,
      orgId,
      member,
      permissions: member.role.permissions as Record<string, boolean>,
    },
  });
});

export function requirePermission(
  permissions: Record<string, boolean>,
  perm: string
): void {
  if (!permissions[perm] && !permissions["*.*"]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing permission: ${perm}`,
    });
  }
}
