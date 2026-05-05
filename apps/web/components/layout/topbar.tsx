"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Bell, ChevronDown, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Topbar({ orgId }: { orgId: string }) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">
                {session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {session?.user?.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{session?.user?.email}</div>
                </div>
                <Link
                  href={`/${orgId}/settings`}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
