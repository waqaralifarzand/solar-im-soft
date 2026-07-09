import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every function here is tenant-scoped (companyId always comes from the caller's
 * getTenantContext(), never the client) and, where noted, date-filtered on the range passed
 * in by the caller (see lib/reportDateRange.ts).
 */

export interface SalesReport {
  invoiceCount: number;
  revenue: string;
  byDay: { date: string; revenue: string }[];
}

/** Gross, tax-inclusive billed revenue — "how much did we sell" for the range. */
export async function getSalesReport(companyId: string, from: Date, to: Date): Promise<SalesReport> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, deletedAt: null, createdAt: { gte: from, lt: to } },
    select: { total: true, createdAt: true },
  });

  let revenue = new Prisma.Decimal(0);
  const byDayMap = new Map<string, Prisma.Decimal>();
  for (const inv of invoices) {
    revenue = revenue.plus(inv.total);
    const day = inv.createdAt.toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? new Prisma.Decimal(0)).plus(inv.total));
  }

  const byDay = [...byDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rev]) => ({ date, revenue: rev.toString() }));

  return { invoiceCount: invoices.length, revenue: revenue.toString(), byDay };
}

export interface ProfitReport {
  revenue: string;
  cogs: string;
  expenses: string;
  profit: string;
}

/**
 * Profit = net revenue − net COGS − expenses, for the range.
 *
 * "Revenue" here is pre-tax and net of bill-level discount (Invoice.subtotal − discount) —
 * NOT the same figure as the Sales tab's gross/tax-inclusive "revenue", since sales tax
 * collected isn't real revenue. COGS is Σ(InvoiceItem.qty × InvoiceItem.costSnapshot) for
 * items on invoices in range (see the Phase 7 costSnapshot migration).
 *
 * Returns net out of BOTH figures, attributed to the period the *return* happened in (not
 * the original sale's period): revenue is reduced by Return.total (same pre-tax per-unit
 * basis as InvoiceItem.unitPrice), and COGS is reduced by each returned line's qty times the
 * cost snapshot of the matching original InvoiceItem (looked up by invoiceId + productId,
 * since ReturnItem doesn't store its own cost).
 */
export async function getProfitReport(companyId: string, from: Date, to: Date): Promise<ProfitReport> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, deletedAt: null, createdAt: { gte: from, lt: to } },
    select: { subtotal: true, discount: true, items: { select: { qty: true, costSnapshot: true } } },
  });

  let revenue = new Prisma.Decimal(0);
  let cogs = new Prisma.Decimal(0);
  for (const inv of invoices) {
    revenue = revenue.plus(inv.subtotal).minus(inv.discount);
    for (const item of inv.items) {
      cogs = cogs.plus(item.costSnapshot.times(item.qty));
    }
  }

  const returns = await prisma.return.findMany({
    where: { companyId, createdAt: { gte: from, lt: to } },
    select: { total: true, invoiceId: true, items: { select: { productId: true, qty: true } } },
  });

  const invoiceIds = [...new Set(returns.map((r) => r.invoiceId))];
  const relevantInvoiceItems = invoiceIds.length
    ? await prisma.invoiceItem.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: { invoiceId: true, productId: true, costSnapshot: true },
      })
    : [];
  const costByInvoiceProduct = new Map<string, Prisma.Decimal>();
  for (const it of relevantInvoiceItems) {
    const key = `${it.invoiceId}:${it.productId}`;
    if (!costByInvoiceProduct.has(key)) costByInvoiceProduct.set(key, it.costSnapshot);
  }

  let returnRevenueReduction = new Prisma.Decimal(0);
  let returnCogsReduction = new Prisma.Decimal(0);
  for (const ret of returns) {
    returnRevenueReduction = returnRevenueReduction.plus(ret.total);
    for (const item of ret.items) {
      const cost = costByInvoiceProduct.get(`${ret.invoiceId}:${item.productId}`) ?? new Prisma.Decimal(0);
      returnCogsReduction = returnCogsReduction.plus(cost.times(item.qty));
    }
  }

  const netRevenue = revenue.minus(returnRevenueReduction);
  const netCogs = cogs.minus(returnCogsReduction);

  const expenseAgg = await prisma.expense.aggregate({
    where: { companyId, date: { gte: from, lt: to } },
    _sum: { amount: true },
  });
  const expenses = expenseAgg._sum.amount ?? new Prisma.Decimal(0);

  const profit = netRevenue.minus(netCogs).minus(expenses);

  return {
    revenue: netRevenue.toString(),
    cogs: netCogs.toString(),
    expenses: expenses.toString(),
    profit: profit.toString(),
  };
}

export interface StockValuationRow {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  costPrice: string;
  value: string;
}

export interface StockValuationReport {
  rows: StockValuationRow[];
  total: string;
}

/** Point-in-time snapshot — current qty × current cost price. Not date-ranged. */
export async function getStockValuation(companyId: string): Promise<StockValuationReport> {
  const products = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  let total = new Prisma.Decimal(0);
  const rows = products.map((p) => {
    const value = p.costPrice.times(p.stockQty);
    total = total.plus(value);
    return { productId: p.id, name: p.name, sku: p.sku, qty: p.stockQty, costPrice: p.costPrice.toString(), value: value.toString() };
  });

  return { rows, total: total.toString() };
}

export interface CustomerDueRow {
  customerId: string;
  name: string;
  phone: string | null;
  balance: string;
}

export interface CustomerDuesReport {
  rows: CustomerDueRow[];
  total: string;
}

/** Point-in-time snapshot — current outstanding balances, sorted descending. Not date-ranged. */
export async function getCustomerDues(companyId: string): Promise<CustomerDuesReport> {
  const customers = await prisma.customer.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, phone: true },
  });
  const balances = await prisma.ledgerEntry.groupBy({
    by: ["customerId"],
    where: { companyId },
    _sum: { debit: true, credit: true },
  });
  const balanceMap = new Map<string, Prisma.Decimal>();
  for (const b of balances) {
    const debit = b._sum.debit ?? new Prisma.Decimal(0);
    const credit = b._sum.credit ?? new Prisma.Decimal(0);
    balanceMap.set(b.customerId, debit.minus(credit));
  }

  let total = new Prisma.Decimal(0);
  const rows = customers
    .map((c) => ({ customer: c, balance: balanceMap.get(c.id) ?? new Prisma.Decimal(0) }))
    .filter((r) => r.balance.gt(0))
    .sort((a, b) => b.balance.minus(a.balance).toNumber())
    .map((r) => {
      total = total.plus(r.balance);
      return { customerId: r.customer.id, name: r.customer.name, phone: r.customer.phone, balance: r.balance.toString() };
    });

  return { rows, total: total.toString() };
}

export interface TopProductRow {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  revenue: string;
}

/** Gross sales for the range (not netted against returns — see getProfitReport for that). */
export async function getTopProducts(companyId: string, from: Date, to: Date): Promise<TopProductRow[]> {
  const items = await prisma.invoiceItem.findMany({
    where: { invoice: { companyId, deletedAt: null, createdAt: { gte: from, lt: to } } },
    select: { productId: true, qty: true, lineTotal: true, product: { select: { name: true, sku: true } } },
  });

  const byProduct = new Map<string, { name: string; sku: string; qty: number; revenue: Prisma.Decimal }>();
  for (const it of items) {
    const existing = byProduct.get(it.productId);
    if (existing) {
      existing.qty += it.qty;
      existing.revenue = existing.revenue.plus(it.lineTotal);
    } else {
      byProduct.set(it.productId, { name: it.product.name, sku: it.product.sku, qty: it.qty, revenue: it.lineTotal });
    }
  }

  return [...byProduct.entries()]
    .map(([productId, v]) => ({ productId, name: v.name, sku: v.sku, qty: v.qty, revenue: v.revenue.toString() }))
    .sort((a, b) => Number(b.revenue) - Number(a.revenue));
}
