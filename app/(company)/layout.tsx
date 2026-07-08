import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell/app-shell";
import { SuspendedLockScreen } from "@/components/suspended-lock-screen";
import { ImpersonationBanner } from "@/components/super/impersonation-banner";

export const dynamic = "force-dynamic";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();

  const [company, user] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { name: true, logoUrl: true, status: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true } }),
  ]);

  if (company.status === "SUSPENDED") {
    return <SuspendedLockScreen />;
  }

  return (
    <div className="flex h-screen flex-col">
      {ctx.impersonatedBy && <ImpersonationBanner companyName={company.name} />}
      <div className="min-h-0 flex-1">
        <AppShell companyName={company.name} logoUrl={company.logoUrl} userName={user.name} role={ctx.role}>
          {children}
        </AppShell>
      </div>
    </div>
  );
}
