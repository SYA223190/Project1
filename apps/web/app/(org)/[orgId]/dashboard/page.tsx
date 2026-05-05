import type { Metadata } from "next";
import { prisma } from "@zoho-clone/db/client";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

interface MetricTileProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}

function MetricTile({ label, value, icon: Icon, trend }: MetricTileProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-slate-400"}`}>
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5" />}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage({ params }: { params: { orgId: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get aggregate metrics from the GL
  const [
    totalReceivables,
    totalPayables,
    monthInvoiceTotal,
    recentInvoices,
    recentCustomers,
  ] = await Promise.all([
    // Total receivables: sum of open invoice amounts
    prisma.invoice.aggregate({
      where: {
        organizationId: params.orgId,
        status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
      },
      _sum: { amountDue: true },
    }),

    // Total payables: 0 for now (bills added in slice 4)
    Promise.resolve({ _sum: { total: 0 } }),

    // Income this month
    prisma.invoice.aggregate({
      where: {
        organizationId: params.orgId,
        status: { in: ["SENT", "PARTIAL", "PAID"] },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { total: true },
    }),

    // Recent invoices
    prisma.invoice.findMany({
      where: { organizationId: params.orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { displayName: true } } },
    }),

    // Top customers
    prisma.customer.findMany({
      where: { organizationId: params.orgId, isActive: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currency = "USD";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Overview of your business finances</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Total Receivables"
          value={formatCurrency(Number(totalReceivables._sum.amountDue ?? 0), currency)}
          icon={TrendingUp}
          trend="neutral"
        />
        <MetricTile
          label="Total Payables"
          value={formatCurrency(0, currency)}
          icon={TrendingDown}
          trend="neutral"
        />
        <MetricTile
          label="Income (this month)"
          value={formatCurrency(Number(monthInvoiceTotal._sum.total ?? 0), currency)}
          icon={DollarSign}
          trend="up"
        />
        <MetricTile
          label="Expenses (this month)"
          value={formatCurrency(0, currency)}
          icon={CreditCard}
          trend="neutral"
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Invoices</h2>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{inv.number}</div>
                    <div className="text-xs text-slate-500">{inv.customer.displayName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrency(Number(inv.total), currency)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                      inv.status === "OVERDUE" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Customers</h2>
          {recentCustomers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No customers yet</p>
          ) : (
            <div className="space-y-3">
              {recentCustomers.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-slate-600">
                      {c.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{c.displayName}</div>
                    {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
