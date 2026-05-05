import { z } from "zod";

export const MODULES = [
  "sales", "purchases", "customers", "vendors", "items", "expenses",
  "banking", "reports", "projects", "timeEntries", "org", "users", "roles",
  "accountant", "documents", "automation",
] as const;

export const ACTIONS = [
  "view", "create", "edit", "delete", "send", "approve", "post", "void",
] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionKey = `${Module}.${Action}`;

export const permissionsSchema = z.record(z.boolean());

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: permissionsSchema,
});

export const updateRoleSchema = createRoleSchema.partial();

export const cloneRoleSchema = z.object({
  sourceRoleId: z.string().cuid(),
  name: z.string().min(1).max(100),
});
