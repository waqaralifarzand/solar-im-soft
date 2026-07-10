import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getAdminDashboard, getManagerDashboard } from "@/lib/queries/dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  if (ctx.role === "CASHIER") {
    redirect("/pos");
  }

  const [user, company] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true } }),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
        {greeting()}, {firstName}
      </h1>

      {ctx.role === "ADMIN" ? (
        <AdminDashboard
          data={await getAdminDashboard(ctx.companyId)}
          currency={company.currency}
          lakhCroreFormat={company.lakhCroreFormat}
        />
      ) : (
        <ManagerDashboard
          data={await getManagerDashboard(ctx.companyId)}
          currency={company.currency}
          lakhCroreFormat={company.lakhCroreFormat}
        />
      )}
    </div>
  );
}
