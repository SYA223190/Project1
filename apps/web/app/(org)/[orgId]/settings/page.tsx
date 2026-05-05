import type { Metadata } from "next";
import { prisma } from "@zoho-clone/db/client";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: { orgId: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: params.orgId },
  });

  const memberCount = await prisma.organizationMember.count({
    where: { organizationId: params.orgId },
  });

  const roles = await prisma.role.findMany({
    where: { organizationId: params.orgId },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your organization settings</p>
      </div>

      {/* Org details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Organization Profile</h2>
        <dl className="grid grid-cols-2 gap-4">
          {[
            { label: "Name", value: org.name },
            { label: "Slug", value: org.slug },
            { label: "Base Currency", value: org.baseCurrency },
            { label: "Country", value: org.country },
            { label: "Fiscal Year Start", value: `Month ${org.fiscalYearStart}` },
            { label: "Timezone", value: org.timezone },
            { label: "Members", value: memberCount.toString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-slate-500 uppercase tracking-wide">{label}</dt>
              <dd className="text-sm font-medium text-slate-900 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Roles */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Roles</h2>
          <button className="text-sm text-primary hover:underline">+ New Role</button>
        </div>
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <span className="text-sm font-medium text-slate-900">{role.name}</span>
                {role.isSystem && (
                  <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">system</span>
                )}
                {role.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                )}
              </div>
              <span className="text-xs text-slate-400">{role._count.members} member{role._count.members !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
