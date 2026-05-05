import type { Metadata } from "next";
import { prisma } from "@zoho-clone/db/client";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Chart of Accounts" };

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  isActive: boolean;
  isSystem: boolean;
  children: Account[];
};

function AccountRow({ account, depth }: { account: Account; depth: number }) {
  return (
    <>
      <tr className="hover:bg-slate-50 border-b border-slate-100">
        <td className="px-4 py-2.5">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 20}px` }}>
            <span className="text-sm text-slate-900">{account.name}</span>
            {account.isSystem && (
              <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">system</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-sm text-slate-500 font-mono">{account.code}</td>
        <td className="px-4 py-2.5 text-sm text-slate-500">{account.subtype.replace(/_/g, " ")}</td>
        <td className="px-4 py-2.5">
          <span className={`text-xs px-2 py-0.5 rounded-full ${account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {account.isActive ? "Active" : "Inactive"}
          </span>
        </td>
      </tr>
      {account.children.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default async function ChartOfAccountsPage({ params }: { params: { orgId: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const accounts = await prisma.account.findMany({
    where: { organizationId: params.orgId },
    orderBy: { code: "asc" },
  });

  type FlatAccount = (typeof accounts)[number] & { children: FlatAccount[] };
  const map = new Map<string, FlatAccount>();
  for (const a of accounts) map.set(a.id, { ...a, children: [] });

  const roots: FlatAccount[] = [];
  for (const a of accounts) {
    if (a.parentId) {
      map.get(a.parentId)?.children.push(map.get(a.id)!);
    } else {
      roots.push(map.get(a.id)!);
    }
  }

  const grouped: Record<string, FlatAccount[]> = {};
  for (const root of roots) {
    if (!grouped[root.type]) grouped[root.type] = [];
    grouped[root.type]!.push(root);
  }

  const typeOrder = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">{accounts.length} accounts</p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          + New Account
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {typeOrder.map((type) => {
          const typeAccounts = grouped[type] ?? [];
          if (typeAccounts.length === 0) return null;
          return (
            <div key={type}>
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {TYPE_LABELS[type] ?? type}
                </span>
              </div>
              <table className="w-full">
                <tbody>
                  {typeAccounts.map((account) => (
                    <AccountRow key={account.id} account={account} depth={0} />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
