import { StatCard } from "@/components/dashboard/stat-card";
import { RecentInvoicesCard } from "@/components/dashboard/recent-invoices-card";
import { formatMoney } from "@/lib/formatMoney";
import type { ManagerDashboardData } from "@/lib/queries/dashboard";

interface ManagerDashboardProps {
  data: ManagerDashboardData;
  currency: string;
  lakhCroreFormat: boolean;
}

/** No dues total, no month revenue chart — MANAGER gets sales + inventory widgets only, per the role matrix. */
export function ManagerDashboard({ data, currency, lakhCroreFormat }: ManagerDashboardProps) {
  const fmt = { currency, lakhCroreFormat };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Today's sales" value={`${data.todaySales.invoiceCount} · ${formatMoney(data.todaySales.revenue, fmt)}`} />
        <StatCard
          label="Low stock items"
          value={String(data.lowStockCount)}
          href="/inventory?lowStock=true"
          tone={data.lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      <RecentInvoicesCard invoices={data.recentInvoices} currency={currency} lakhCroreFormat={lakhCroreFormat} />
    </div>
  );
}
