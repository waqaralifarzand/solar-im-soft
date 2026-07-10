import { StatCard } from "@/components/dashboard/stat-card";
import { MonthRevenueChart } from "@/components/dashboard/month-revenue-chart";
import { RecentInvoicesCard } from "@/components/dashboard/recent-invoices-card";
import { formatMoney } from "@/lib/formatMoney";
import type { AdminDashboardData } from "@/lib/queries/dashboard";

interface AdminDashboardProps {
  data: AdminDashboardData;
  currency: string;
  lakhCroreFormat: boolean;
}

export function AdminDashboard({ data, currency, lakhCroreFormat }: AdminDashboardProps) {
  const fmt = { currency, lakhCroreFormat };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today's sales" value={`${data.todaySales.invoiceCount} · ${formatMoney(data.todaySales.revenue, fmt)}`} />
        <StatCard label="Customer dues" value={formatMoney(data.duesTotal, fmt)} href="/reports/customer-dues" />
        <StatCard
          label="Low stock items"
          value={String(data.lowStockCount)}
          href="/inventory?lowStock=true"
          tone={data.lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthRevenueChart byDay={data.monthRevenueByDay} currency={currency} lakhCroreFormat={lakhCroreFormat} />
        </div>
        <RecentInvoicesCard invoices={data.recentInvoices} currency={currency} lakhCroreFormat={lakhCroreFormat} />
      </div>
    </div>
  );
}
