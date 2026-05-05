import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/root";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env["VERCEL_URL"]) return `https://${process.env["VERCEL_URL"]}`;
  return `http://localhost:${process.env["PORT"] ?? 3000}`;
}

export const trpcServer = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
    }),
  ],
});
