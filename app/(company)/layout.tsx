import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell/app-shell";
import { SuspendedLockScreen } from "@/components/suspended-lock-screen";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { companyId, role } = await getTenantContext();
  const session = await getServerSession(authOptions);

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { name: true, logoUrl: true, status: true },
  });

  if (company.status === "SUSPENDED") {
    return <SuspendedLockScreen />;
  }

  return (
    <AppShell
      companyName={company.name}
      logoUrl={company.logoUrl}
      userName={session?.user.name ?? ""}
      role={role}
    >
      {children}
    </AppShell>
  );
}
