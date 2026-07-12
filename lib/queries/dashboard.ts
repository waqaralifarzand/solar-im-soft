import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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

/** Same qty <= reorderLevel definition as the Inventory list's "Low stock" chip — computed in JS since Prisma can't filter one column against another. */
function countLowStock(products: { stockQty: number; reorderLevel: number }[]): number {
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

function mapRecentInvoices(
  invoices: { id: string; invoiceNo: string; status: string; total: Prisma.Decimal; createdAt: Date; customer: { name: string } | null }[],
): RecentInvoiceRow[] {
  return invoices.map((i) => ({
    id: i.id,
    invoiceNo: i.invoiceNo,
    customerName: i.customer?.name ?? null,
    status: i.status,
    total: i.total.toString(),
    createdAt: i.createdAt,
  }));
}

/** Sum of currently-owed (positive) per-customer ledger balances — same definition as getCustomerDues, total only. */
function sumDues(
  customerIds: string[],
  balances: { customerId: string; _sum?: { debit?: Prisma.Decimal | null; credit?: Prisma.Decimal | null } | null }[],
): string {
  const balanceMap = new Map<string, Prisma.Decimal>();
  for (const b of balances) {
    const debit = b._sum?.debit ?? new Prisma.Decimal(0);
    const credit = b._sum?.credit ?? new Prisma.Decimal(0);
    balanceMap.set(b.customerId, debit.minus(credit));
  }
  let total = new Prisma.Decimal(0);
  for (const id of customerIds) {
    const balance = balanceMap.get(id) ?? new Prisma.Decimal(0);
    if (balance.gt(0)) total = total.plus(balance);
  }
  return total.toString();
}

export interface AdminDashboardData {
  todaySales: TodaySales;
  monthRevenueByDay: { date: string; revenue: string }[];
  duesTotal: string;
  lowStockCount: number;
  recentInvoices: RecentInvoiceRow[];
}

/**
 * ADMIN sees the full KPI set, including company-wide financial totals (dues).
 *
 * Batched as a single `$transaction` (one round trip to the DB instead of five independent
 * ones) and fetches the current month's invoices exactly once — "today" is derived by
 * filtering those same in-memory rows rather than issuing a second, overlapping invoice scan
 * (today is always inside the current month, so the old two-query version was re-fetching
 * today's rows twice). See SCRATCHPAD.md's perf investigation report.
 */
export async function getAdminDashboard(companyId: string): Promise<AdminDashboardData> {
  const monthRange = parseReportDateRange();
  const { from: todayFrom, to: todayTo } = todayUtcRange();

  const [monthInvoices, products, recentInvoices, customers, balances] = await prisma.$transaction([
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null, createdAt: { gte: monthRange.from, lt: monthRange.to } },
      select: { total: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { companyId, deletedAt: null },
      select: { stockQty: true, reorderLevel: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.customer.findMany({ where: { companyId, deletedAt: null }, select: { id: true } }),
    prisma.ledgerEntry.groupBy({
      by: ["customerId"],
      where: { companyId },
      orderBy: { customerId: "asc" },
      _sum: { debit: true, credit: true },
    }),
  ]);

  let todayRevenue = new Prisma.Decimal(0);
  let todayCount = 0;
  const byDayMap = new Map<string, Prisma.Decimal>();
  for (const inv of monthInvoices) {
    const day = inv.createdAt.toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? new Prisma.Decimal(0)).plus(inv.total));
    if (inv.createdAt >= todayFrom && inv.createdAt < todayTo) {
      todayRevenue = todayRevenue.plus(inv.total);
      todayCount += 1;
    }
  }
  const monthRevenueByDay = [...byDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue: revenue.toString() }));

  return {
    todaySales: { invoiceCount: todayCount, revenue: todayRevenue.toString() },
    monthRevenueByDay,
    duesTotal: sumDues(customers.map((c) => c.id), balances),
    lowStockCount: countLowStock(products),
    recentInvoices: mapRecentInvoices(recentInvoices),
  };
}

export interface ManagerDashboardData {
  todaySales: TodaySales;
  lowStockCount: number;
  recentInvoices: RecentInvoiceRow[];
}

/**
 * MANAGER sees inventory + sales widgets only — no dues/profit or other company-wide financial
 * totals. Batched as a single `$transaction` (3 statements, one round trip). Deliberately does
 * NOT reuse the ADMIN dashboard's month-range query: the Manager view never shows the month
 * chart, so fetching a whole month of invoices just to derive "today" would fetch strictly
 * more data than the narrow today-only range this view actually needs.
 */
export async function getManagerDashboard(companyId: string): Promise<ManagerDashboardData> {
  const { from: todayFrom, to: todayTo } = todayUtcRange();

  const [todayInvoices, products, recentInvoices] = await prisma.$transaction([
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null, createdAt: { gte: todayFrom, lt: todayTo } },
      select: { total: true },
    }),
    prisma.product.findMany({
      where: { companyId, deletedAt: null },
      select: { stockQty: true, reorderLevel: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const todayRevenue = todayInvoices.reduce((sum, inv) => sum.plus(inv.total), new Prisma.Decimal(0));

  return {
    todaySales: { invoiceCount: todayInvoices.length, revenue: todayRevenue.toString() },
    lowStockCount: countLowStock(products),
    recentInvoices: mapRecentInvoices(recentInvoices),
  };
}
