"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createReturnSchema, type CreateReturnInput } from "@/lib/validations/returns";

const RETURN_ROLES = ["ADMIN", "MANAGER"] as const;

export async function createReturn(input: CreateReturnInput): Promise<{ id: string }> {
  const ctx = await requireRole(...RETURN_ROLES);
  const parsed = createReturnSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: parsed.invoiceId, companyId: ctx.companyId, deletedAt: null },
      include: { items: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    // Lock the invoice row for the rest of this transaction: two concurrent returns on the
    // same invoice must serialize here, or both could read the same "returnable" figure and
    // together over-return more than was ever sold. Same FOR UPDATE pattern used for
    // per-company invoice/quote numbering, applied to a per-invoice critical section instead.
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoice.id} FOR UPDATE`;

    const soldByProduct = new Map<string, number>();
    for (const item of invoice.items) {
      soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.qty);
    }
    const unitPriceByProduct = new Map<string, Prisma.Decimal>();
    for (const item of invoice.items) {
      if (!unitPriceByProduct.has(item.productId)) unitPriceByProduct.set(item.productId, item.unitPrice);
    }

    // Re-fetch already-returned quantities *after* acquiring the lock so a concurrent
    // return that just committed is reflected here.
    const existingReturnItems = await tx.returnItem.findMany({
      where: { return: { invoiceId: invoice.id } },
      select: { productId: true, qty: true },
    });
    const returnedByProduct = new Map<string, number>();
    for (const ri of existingReturnItems) {
      returnedByProduct.set(ri.productId, (returnedByProduct.get(ri.productId) ?? 0) + ri.qty);
    }

    let total = new Prisma.Decimal(0);
    const lineData: { productId: string; qty: number; unitPrice: Prisma.Decimal }[] = [];
    for (const reqItem of parsed.items) {
      const sold = soldByProduct.get(reqItem.productId);
      const unitPrice = unitPriceByProduct.get(reqItem.productId);
      if (sold === undefined || !unitPrice) throw new Error("That item was not part of this invoice");

      const alreadyReturned = returnedByProduct.get(reqItem.productId) ?? 0;
      const returnable = sold - alreadyReturned;
      if (reqItem.qty > returnable) {
        throw new Error(`Cannot return more than ${returnable} unit(s) for that item`);
      }

      lineData.push({ productId: reqItem.productId, qty: reqItem.qty, unitPrice });
      total = total.plus(unitPrice.times(reqItem.qty));
    }

    const ret = await tx.return.create({
      data: {
        companyId: ctx.companyId,
        invoiceId: invoice.id,
        total,
        restock: parsed.restock,
        note: parsed.note || null,
        createdBy: ctx.userId,
      },
    });

    await tx.returnItem.createMany({
      data: lineData.map((l) => ({ returnId: ret.id, productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })),
    });

    if (parsed.restock) {
      for (const l of lineData) {
        await tx.product.update({
          where: { id: l.productId },
          data: { stockQty: { increment: l.qty } },
        });
        await tx.stockAdjustment.create({
          data: {
            companyId: ctx.companyId,
            productId: l.productId,
            userId: ctx.userId,
            qtyChange: l.qty,
            reason: "RETURN",
            refId: ret.id,
          },
        });
      }
    }

    // Ledger credit only — never touches Invoice.paidAmount/status. Returns are recorded
    // conservatively (ARCHITECTURE.md §3): no auto-refund of cash, no reopening of an
    // already-derived PAID/PARTIAL/UNPAID status. The Return row itself is the record of
    // what happened; a cash refund (if any) is a real-world action noted by staff, not
    // something this system automates.
    if (invoice.customerId) {
      await tx.ledgerEntry.create({
        data: {
          companyId: ctx.companyId,
          customerId: invoice.customerId,
          userId: ctx.userId,
          type: "RETURN",
          debit: 0,
          credit: total,
          refId: ret.id,
          note: `Return for ${invoice.invoiceNo}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "return.create",
        entity: "Invoice",
        entityId: invoice.id,
        meta: { returnId: ret.id, total: total.toString(), restock: parsed.restock },
      },
    });

    return { id: ret.id };
  });
}
