import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell/app-shell";
import { SuspendedLockScreen } from "@/components/suspended-lock-screen";
import { ImpersonationBanner } from "@/components/super/impersonation-banner";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();

  // logoUrl itself is deliberately NOT selected here — this layout re-renders on every
  // navigation and every router.refresh(), and the stored value is a base64 data URI that can
  // run to hundreds of KB (see SCRATCHPAD.md's perf investigation report). The sidebar fetches
  // the logo bytes from the small, cacheable /api/company/logo route instead; this only needs
  // to know whether one exists.
  const [company, hasLogoCount, user] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { name: true, status: true, accentColor: true, onboardingComplete: true },
    }),
    prisma.company.count({ where: { id: ctx.companyId, logoUrl: { not: null } } }),
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true } }),
  ]);

  if (company.status === "SUSPENDED") {
    return <SuspendedLockScreen />;
  }

  if (ctx.role === "ADMIN" && !company.onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen flex-col" style={{ "--accent": company.accentColor } as React.CSSProperties}>
      <ToastProvider>
        {ctx.impersonatedBy && <ImpersonationBanner companyName={company.name} />}
        <div className="min-h-0 flex-1">
          <AppShell
            companyName={company.name}
            hasLogo={hasLogoCount > 0}
            userName={user.name}
            role={ctx.role}
            isImpersonating={!!ctx.impersonatedBy}
          >
            {children}
          </AppShell>
        </div>
      </ToastProvider>
    </div>
  );
}
