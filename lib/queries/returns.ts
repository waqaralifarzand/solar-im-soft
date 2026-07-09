import { prisma } from "@/lib/prisma";

export interface ReturnableLine {
  productId: string;
  name: string;
  sku: string;
  soldQty: number;
  returnedQty: number;
  returnableQty: number;
}

/** Sold qty per product on this invoice, minus qty already returned across all Return rows. */
export async function getReturnableLines(companyId: string, invoiceId: string): Promise<ReturnableLine[]> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId, deletedAt: null },
    include: { items: { include: { product: { select: { name: true, sku: true } } } } },
  });
  if (!invoice) return [];

  const soldByProduct = new Map<string, { qty: number; name: string; sku: string }>();
  for (const item of invoice.items) {
    const existing = soldByProduct.get(item.productId);
    if (existing) existing.qty += item.qty;
    else soldByProduct.set(item.productId, { qty: item.qty, name: item.product.name, sku: item.product.sku });
  }

  const returnItems = await prisma.returnItem.findMany({
    where: { return: { invoiceId } },
    select: { productId: true, qty: true },
  });
  const returnedByProduct = new Map<string, number>();
  for (const ri of returnItems) {
    returnedByProduct.set(ri.productId, (returnedByProduct.get(ri.productId) ?? 0) + ri.qty);
  }

  return [...soldByProduct.entries()].map(([productId, info]) => {
    const returnedQty = returnedByProduct.get(productId) ?? 0;
    return {
      productId,
      name: info.name,
      sku: info.sku,
      soldQty: info.qty,
      returnedQty,
      returnableQty: Math.max(0, info.qty - returnedQty),
    };
  });
}

export interface ReturnRow {
  id: string;
  total: string;
  restock: boolean;
  note: string | null;
  createdAt: Date;
  createdByName: string;
  items: { productId: string; productName: string; qty: number; unitPrice: string }[];
}

export async function listReturnsForInvoice(companyId: string, invoiceId: string): Promise<ReturnRow[]> {
  const returns = await prisma.return.findMany({
    where: { companyId, invoiceId },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  const userIds = [...new Set(returns.map((r) => r.createdBy))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return returns.map((r) => ({
    id: r.id,
    total: r.total.toString(),
    restock: r.restock,
    note: r.note,
    createdAt: r.createdAt,
    createdByName: userById.get(r.createdBy) ?? "Unknown",
    items: r.items.map((it) => ({
      productId: it.productId,
      productName: it.product.name,
      qty: it.qty,
      unitPrice: it.unitPrice.toString(),
    })),
  }));
}
