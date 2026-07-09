"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { nextPoNo } from "@/lib/generatePoNo";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  receivePurchaseOrderSchema,
  type CreatePurchaseOrderInput,
  type UpdatePurchaseOrderStatusInput,
  type ReceivePurchaseOrderInput,
} from "@/lib/validations/purchases";

const PURCHASE_ROLES = ["ADMIN", "MANAGER"] as const;

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<{ id: string; poNo: string }> {
  const ctx = await requireRole(...PURCHASE_ROLES);
  const parsed = createPurchaseOrderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({
      where: { id: parsed.supplierId, companyId: ctx.companyId, deletedAt: null },
    });
    if (!supplier) throw new Error("Supplier not found");

    const productIds = [...new Set(parsed.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, companyId: ctx.companyId, deletedAt: null },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const item of parsed.items) {
      if (!productById.has(item.productId)) throw new Error("One or more products were not found");
    }

    let total = new Prisma.Decimal(0);
    const lineData = parsed.items.map((item) => {
      const unitCost = new Prisma.Decimal(item.unitCost);
      total = total.plus(unitCost.times(item.qty));
      return { productId: item.productId, qty: item.qty, unitCost };
    });

    const poNo = await nextPoNo(tx, ctx.companyId);

    const po = await tx.purchaseOrder.create({
      data: {
        companyId: ctx.companyId,
        supplierId: parsed.supplierId,
        poNo,
        status: "DRAFT",
        subtotal: total,
        total,
        createdBy: ctx.userId,
      },
    });

    await tx.purchaseItem.createMany({
      data: lineData.map((l) => ({ poId: po.id, productId: l.productId, qty: l.qty, unitCost: l.unitCost })),
    });

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "po.create",
        entity: "PurchaseOrder",
        entityId: po.id,
        meta: { poNo, total: total.toString() },
      },
    });

    return { id: po.id, poNo };
  });
}

export async function updatePurchaseOrderStatus(
  poId: string,
  input: UpdatePurchaseOrderStatusInput,
): Promise<void> {
  const ctx = await requireRole(...PURCHASE_ROLES);
  const parsed = updatePurchaseOrderStatusSchema.parse(input);

  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, companyId: ctx.companyId } });
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "RECEIVED") {
    throw new Error("This purchase order has already been received and its status can't change");
  }

  await prisma.$transaction([
    prisma.purchaseOrder.update({ where: { id: poId }, data: { status: parsed.status } }),
    prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "po.status_change",
        entity: "PurchaseOrder",
        entityId: poId,
        meta: { from: po.status, to: parsed.status },
      },
    }),
  ]);
}

export async function receivePurchaseOrder(poId: string, input: ReceivePurchaseOrderInput): Promise<void> {
  const ctx = await requireRole(...PURCHASE_ROLES);
  const parsed = receivePurchaseOrderSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    // Atomic conditional flip claims the "receive" for exactly one concurrent caller: if two
    // requests race, only one WHERE match can succeed, and the loser's re-checked WHERE no
    // longer matches once the winner's status commits, so it gets count === 0. Same
    // optimistic-update technique as recordInvoicePayment (Phase 5A).
    const claimed = await tx.purchaseOrder.updateMany({
      where: { id: poId, companyId: ctx.companyId, status: { not: "RECEIVED" } },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new Error("This purchase order has already been received");
    }

    const po = await tx.purchaseOrder.findFirst({
      where: { id: poId, companyId: ctx.companyId },
      include: { items: true },
    });
    if (!po) throw new Error("Purchase order not found");

    const updateCostPriceSet = new Set(parsed.updateCostPriceProductIds);

    for (const item of po.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQty: { increment: item.qty },
          ...(updateCostPriceSet.has(item.productId) ? { costPrice: item.unitCost } : {}),
        },
      });
      await tx.stockAdjustment.create({
        data: {
          companyId: ctx.companyId,
          productId: item.productId,
          userId: ctx.userId,
          qtyChange: item.qty,
          reason: "PURCHASE",
          refId: po.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "po.receive",
        entity: "PurchaseOrder",
        entityId: poId,
        meta: { poNo: po.poNo, itemCount: po.items.length, costPriceUpdatedFor: [...updateCostPriceSet] },
      },
    });
  });
}
