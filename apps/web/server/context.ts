import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@zoho-clone/db/client";
import { GLService } from "@zoho-clone/core/gl";
import { AuditService } from "@zoho-clone/core/audit";
import { NumberingService } from "@zoho-clone/core/numbering";

export async function createContext(req: NextRequest) {
  const session = await auth();
  const orgId = req.headers.get("x-org-id") ?? undefined;
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  return {
    session,
    userId: session?.user?.id,
    orgId,
    ip,
    userAgent,
    db: prisma,
    gl: new GLService(prisma),
    audit: new AuditService(prisma),
    numbering: new NumberingService(prisma),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
