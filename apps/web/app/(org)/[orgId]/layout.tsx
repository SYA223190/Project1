import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@zoho-clone/db/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: { orgId: string };
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/${params.orgId}/dashboard`);
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.orgId,
        userId: session.user.id,
      },
    },
    include: { organization: true },
  });

  if (!member) {
    redirect("/orgs");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar orgId={params.orgId} orgName={member.organization.name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar orgId={params.orgId} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
