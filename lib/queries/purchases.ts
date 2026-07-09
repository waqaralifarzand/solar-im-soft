import { prisma } from "@/lib/prisma";

export interface PurchaseOrderRow {
  id: string;
  poNo: string;
  supplierName: string;
  status: string;
  total: string;
  receivedAt: Date | null;
  createdAt: Date;
  createdByName: string;
}

export async function listPurchaseOrders(companyId: string): Promise<PurchaseOrderRow[]> {
  const pos = await prisma.purchaseOrder.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { name: true } } },
  });

  const userIds = [...new Set(pos.map((p) => p.createdBy))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return pos.map((p) => ({
    id: p.id,
    poNo: p.poNo,
    supplierName: p.supplier.name,
    status: p.status,
    total: p.total.toString(),
    receivedAt: p.receivedAt,
    createdAt: p.createdAt,
    createdByName: userById.get(p.createdBy) ?? "Unknown",
  }));
}

export interface PurchaseOrderDetail {
  id: string;
  poNo: string;
  status: string;
  subtotal: string;
  total: string;
  receivedAt: Date | null;
  createdAt: Date;
  createdByName: string;
  supplier: { id: string; name: string; phone: string | null };
  items: {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    qty: number;
    unitCost: string;
  }[];
}

export async function getPurchaseOrderDetail(companyId: string, poId: string): Promise<PurchaseOrderDetail | null> {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, companyId },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  });
  if (!po) return null;

  const creator = await prisma.user.findUnique({ where: { id: po.createdBy }, select: { name: true } });

  return {
    id: po.id,
    poNo: po.poNo,
    status: po.status,
    subtotal: po.subtotal.toString(),
    total: po.total.toString(),
    receivedAt: po.receivedAt,
    createdAt: po.createdAt,
    createdByName: creator?.name ?? "Unknown",
    supplier: po.supplier,
    items: po.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product.name,
      productSku: it.product.sku,
      qty: it.qty,
      unitCost: it.unitCost.toString(),
    })),
  };
}
