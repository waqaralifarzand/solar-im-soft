import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { ReportsTabs } from "@/components/reports/reports-tabs";
import { DateRangePicker } from "@/components/reports/date-range-picker";

export const dynamic = "force-dynamic";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN" && ctx.role !== "MANAGER") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Reports</h1>
        <DateRangePicker />
      </div>
      <ReportsTabs />
      {children}
    </div>
  );
}
