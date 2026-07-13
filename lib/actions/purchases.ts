"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { nextPoNo } from "@/lib/generatePoNo";
import { DEFAULT_TX_OPTIONS, toUserFacingError } from "@/lib/transactionHelpers";
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
  }, DEFAULT_TX_OPTIONS);
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

  // Prisma's batch/array $transaction form only accepts { isolationLevel }, not
  // maxWait/timeout — those apply to the interactive (callback) form only. This batch is
  // two simple writes with no risk of the P2028 timeout the interactive transactions below
  // were fixed for, so no options are needed here.
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

  try {
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

      // Aggregate by product first — a PO can carry the same product on more than one line —
      // so stock and cost price are each computed once per product, not once per line. Qty
      // increments are summed (order-independent); when a cost update is requested for a
      // product with more than one line, the last line's unitCost wins, same as the previous
      // sequential-update loop (later updateMany overwrite semantics).
      const qtyByProduct = new Map<string, number>();
      const costByProduct = new Map<string, Prisma.Decimal>();
      for (const item of po.items) {
        qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
        if (updateCostPriceSet.has(item.productId)) {
          costByProduct.set(item.productId, item.unitCost);
        }
      }
      const uniqueProductIds = [...qtyByProduct.keys()];

      // Split into two groups instead of one 3-array unnest with nulls standing in for "no
      // cost change" — passing a mixed null/non-null array through Prisma's raw-query binary
      // protocol to a numeric[] parameter corrupts the wire encoding (reproduced directly
      // against Postgres: "insufficient data left in message"). Two plain, all-non-null bulk
      // updates sidestep that entirely and are still just 1-2 round trips total, not one per
      // product.
      const withCostUpdate = uniqueProductIds.filter((id) => costByProduct.has(id));
      const withoutCostUpdate = uniqueProductIds.filter((id) => !costByProduct.has(id));

      if (withCostUpdate.length > 0) {
        const qtys = withCostUpdate.map((id) => qtyByProduct.get(id)!);
        const costs = withCostUpdate.map((id) => costByProduct.get(id)!.toString());
        await tx.$executeRaw`
          UPDATE "Product" AS p
          SET "stockQty" = p."stockQty" + v.qty,
              "costPrice" = v.cost
          FROM unnest(${withCostUpdate}::text[], ${qtys}::int[], ${costs}::numeric[]) AS v(id, qty, cost)
          WHERE p.id = v.id AND p."companyId" = ${ctx.companyId}
        `;
      }
      if (withoutCostUpdate.length > 0) {
        const qtys = withoutCostUpdate.map((id) => qtyByProduct.get(id)!);
        await tx.$executeRaw`
          UPDATE "Product" AS p
          SET "stockQty" = p."stockQty" + v.qty
          FROM unnest(${withoutCostUpdate}::text[], ${qtys}::int[]) AS v(id, qty)
          WHERE p.id = v.id AND p."companyId" = ${ctx.companyId}
        `;
      }

      await tx.stockAdjustment.createMany({
        data: uniqueProductIds.map((productId) => ({
          companyId: ctx.companyId,
          productId,
          userId: ctx.userId,
          qtyChange: qtyByProduct.get(productId)!,
          reason: "PURCHASE" as const,
          refId: po.id,
        })),
      });

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
    }, DEFAULT_TX_OPTIONS);
  } catch (error) {
    throw toUserFacingError(error, "Receiving this purchase order failed due to a temporary issue — please try again.");
  }
}
