"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { formatDate } from "@/lib/utils";

export default function OrgsPage() {
  const router = useRouter();
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (me?.members.length === 1) {
      const m = me.members[0];
      if (m) {
        localStorage.setItem("currentOrgId", m.organization.id);
        router.push(`/${m.organization.id}/dashboard`);
      }
    }
  }, [me, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const memberships = me?.members ?? [];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Select Organization</h1>
          <p className="text-slate-500 text-sm mt-1">Choose an organization to continue</p>
        </div>

        <div className="space-y-3">
          {memberships.map((m) => (
            <button
              key={m.organizationId}
              onClick={() => {
                localStorage.setItem("currentOrgId", m.organizationId);
                router.push(`/${m.organizationId}/dashboard`);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-primary hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {m.organization.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 truncate">{m.organization.name}</div>
                  <div className="text-xs text-slate-500">{m.role.name}</div>
                </div>
              </div>
            </button>
          ))}

          {memberships.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p className="mb-4">No organizations yet.</p>
              <Link
                href="/orgs/new"
                className="inline-block bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create your first organization
              </Link>
            </div>
          )}
        </div>

        {memberships.length > 0 && (
          <div className="mt-6 text-center">
            <Link href="/orgs/new" className="text-sm text-primary hover:underline">
              + Create new organization
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
