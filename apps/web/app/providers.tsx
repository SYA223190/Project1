"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc-client";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return `http://localhost:${process.env["PORT"] ?? 3000}`;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30 * 1000, retry: 1 },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            const orgId = typeof window !== "undefined"
              ? window.localStorage.getItem("currentOrgId") ?? undefined
              : undefined;
            return orgId ? { "x-org-id": orgId } : {};
          },
        }),
      ],
    })
  );

  return (
    <SessionProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  );
}
