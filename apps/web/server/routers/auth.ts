import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { signUpSchema } from "@zoho-clone/shared/schemas";
import { z } from "zod";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export const authRouter = router({
  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: hashPassword(input.password),
        },
      });

      return { id: user.id, email: user.email, name: user.name };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        twoFactorEnabled: true,
        createdAt: true,
        members: {
          include: {
            organization: { select: { id: true, name: true, slug: true } },
            role: { select: { id: true, name: true } },
          },
        },
      },
    });
    return user;
  }),

  requestMagicLink: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const token = createHash("sha256")
        .update(`${input.email}:${Date.now()}:${Math.random()}`)
        .digest("hex");

      await ctx.db.verificationToken.create({
        data: {
          identifier: input.email,
          token,
          expires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // In production: send email via nodemailer
      // In dev: log the link
      console.log(`Magic link for ${input.email}: /api/auth/magic?token=${token}`);
      return { sent: true };
    }),

  verifyMagicLink: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const verification = await ctx.db.verificationToken.findUnique({
        where: { token: input.token },
      });

      if (!verification || verification.expires < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
      }

      await ctx.db.verificationToken.delete({ where: { token: input.token } });

      let user = await ctx.db.user.findUnique({
        where: { email: verification.identifier },
      });

      if (!user) {
        user = await ctx.db.user.create({
          data: {
            email: verification.identifier,
            emailVerified: new Date(),
          },
        });
      } else if (!user.emailVerified) {
        await ctx.db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }

      return { userId: user.id, email: user.email };
    }),
});
