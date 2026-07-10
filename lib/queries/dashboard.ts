import { prisma } from "@/lib/prisma";
import { getSalesReport, getCustomerDues } from "@/lib/queries/reports";
import { parseReportDateRange } from "@/lib/reportDateRange";

function todayUtcRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export interface TodaySales {
  invoiceCount: number;
  revenue: string;
}

/** Gross, tax-inclusive — same basis as the Sales report, just narrowed to today (UTC). */
export async function getTodaySales(companyId: string): Promise<TodaySales> {
  const { from, to } = todayUtcRange();
  const report = await getSalesReport(companyId, from, to);
  return { invoiceCount: report.invoiceCount, revenue: report.revenue };
}

/** Reuses the Sales report's day-bucketed revenue for the current month — same figures /reports/sales would show. */
export async function getMonthRevenueByDay(companyId: string): Promise<{ date: string; revenue: string }[]> {
  const range = parseReportDateRange();
  const report = await getSalesReport(companyId, range.from, range.to);
  return report.byDay;
}

/** Same qty <= reorderLevel definition as the Inventory list's "Low stock" chip — computed in JS since Prisma can't filter one column against another. */
export async function getLowStockCount(companyId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    select: { stockQty: true, reorderLevel: true },
  });
  return products.filter((p) => p.stockQty <= p.reorderLevel).length;
}

export interface RecentInvoiceRow {
  id: string;
  invoiceNo: string;
  customerName: string | null;
  status: string;
  total: string;
  createdAt: Date;
}

export async function getRecentInvoices(companyId: string, limit = 5): Promise<RecentInvoiceRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { customer: { select: { name: true } } },
  });
  return invoices.map((i) => ({
    id: i.id,
    invoiceNo: i.invoiceNo,
    customerName: i.customer?.name ?? null,
    status: i.status,
    total: i.total.toString(),
    createdAt: i.createdAt,
  }));
}

export interface AdminDashboardData {
  todaySales: TodaySales;
  monthRevenueByDay: { date: string; revenue: string }[];
  duesTotal: string;
  lowStockCount: number;
  recentInvoices: RecentInvoiceRow[];
}

/** ADMIN sees the full KPI set, including company-wide financial totals (dues). */
export async function getAdminDashboard(companyId: string): Promise<AdminDashboardData> {
  const [todaySales, monthRevenueByDay, dues, lowStockCount, recentInvoices] = await Promise.all([
    getTodaySales(companyId),
    getMonthRevenueByDay(companyId),
    getCustomerDues(companyId),
    getLowStockCount(companyId),
    getRecentInvoices(companyId),
  ]);
  return { todaySales, monthRevenueByDay, duesTotal: dues.total, lowStockCount, recentInvoices };
}

export interface ManagerDashboardData {
  todaySales: TodaySales;
  lowStockCount: number;
  recentInvoices: RecentInvoiceRow[];
}

/** MANAGER sees inventory + sales widgets only — no dues/profit or other company-wide financial totals. */
export async function getManagerDashboard(companyId: string): Promise<ManagerDashboardData> {
  const [todaySales, lowStockCount, recentInvoices] = await Promise.all([
    getTodaySales(companyId),
    getLowStockCount(companyId),
    getRecentInvoices(companyId),
  ]);
  return { todaySales, lowStockCount, recentInvoices };
}
