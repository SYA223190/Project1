import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
});

export const magicLinkSchema = z.object({
  email: z.string().email(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
});

export const enable2FASchema = z.object({
  totpCode: z.string().length(6),
});
