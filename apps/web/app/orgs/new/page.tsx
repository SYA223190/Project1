"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { slugify } from "@/lib/utils";

export default function NewOrgPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  const createOrg = trpc.org.create.useMutation({
    onSuccess: (org) => {
      localStorage.setItem("currentOrgId", org.id);
      router.push(`/${org.id}/dashboard`);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    createOrg.mutate({
      name: fd.get("name") as string,
      slug: fd.get("slug") as string,
      baseCurrency: "USD",
      country: "US",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">New Organization</h1>
        <p className="text-slate-500 text-sm mb-6">Set up your business account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Organization name
            </label>
            <input
              name="name"
              type="text"
              required
              minLength={2}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Acme Corporation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL slug</label>
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
              <span className="px-3 py-2 bg-slate-50 text-slate-400 text-sm border-r border-slate-300">
                app/
              </span>
              <input
                name="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                pattern="^[a-z0-9-]+$"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                placeholder="acme-corp"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>

          <button
            type="submit"
            disabled={createOrg.isPending}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createOrg.isPending ? "Creating..." : "Create organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
