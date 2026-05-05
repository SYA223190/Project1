"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const signUp = trpc.auth.signUp.useMutation({
    onSuccess: () => router.push("/login?registered=1"),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    signUp.mutate({
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">Create an account</h2>
      <p className="text-slate-500 text-sm mb-6">Get started with your free account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="jane@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Min 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={signUp.isPending}
          className="w-full bg-primary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {signUp.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
