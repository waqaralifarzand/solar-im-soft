"use server";

import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";

export interface GlobalSearchResults {
  products: { id: string; name: string; sku: string }[];
  customers: { id: string; name: string; phone: string | null }[];
  invoices: { id: string; invoiceNo: string; customerName: string | null }[];
}

const RESULT_LIMIT = 5;

/** Cmd+K palette search. Tenant-scoped from the session, never from client input. */
export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const ctx = await getTenantContext();
  const term = query.trim();
  if (term.length < 2) {
    return { products: [], customers: [], invoices: [] };
  }

  const [products, customers, invoices] = await Promise.all([
    prisma.product.findMany({
      where: {
        companyId: ctx.companyId,
        deletedAt: null,
        OR: [{ name: { contains: term, mode: "insensitive" } }, { sku: { contains: term, mode: "insensitive" } }],
      },
      select: { id: true, name: true, sku: true },
      take: RESULT_LIMIT,
    }),
    prisma.customer.findMany({
      where: {
        companyId: ctx.companyId,
        deletedAt: null,
        OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }],
      },
      select: { id: true, name: true, phone: true },
      take: RESULT_LIMIT,
    }),
    prisma.invoice.findMany({
      where: { companyId: ctx.companyId, deletedAt: null, invoiceNo: { contains: term, mode: "insensitive" } },
      select: { id: true, invoiceNo: true, customer: { select: { name: true } } },
      take: RESULT_LIMIT,
    }),
  ]);

  return {
    products,
    customers,
    invoices: invoices.map((i) => ({ id: i.id, invoiceNo: i.invoiceNo, customerName: i.customer?.name ?? null })),
  };
}
