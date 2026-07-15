"use server";

import { Prisma } from "@prisma/client";
import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { nextInvoiceNo } from "@/lib/generateInvoiceNo";
import { DEFAULT_TX_OPTIONS, toUserFacingError } from "@/lib/transactionHelpers";
import {
  createInvoiceSchema,
  recordPaymentSchema,
  type CreateInvoiceInput,
  type RecordPaymentInput,
} from "@/lib/validations/invoices";

const SALE_ROLES = ["ADMIN", "MANAGER", "CASHIER"] as const;

function deriveStatus(paidAmount: Prisma.Decimal, total: Prisma.Decimal): InvoiceStatus {
  if (paidAmount.lte(0)) return "UNPAID";
  if (paidAmount.gte(total)) return "PAID";
  return "PARTIAL";
}

export async function createInvoice(input: CreateInvoiceInput): Promise<{ id: string; invoiceNo: string }> {
  const ctx = await requireRole(...SALE_ROLES);
  const parsed = createInvoiceSchema.parse(input);
  const customerId = parsed.customerId || null;

  try {
    return await prisma.$transaction(async (tx) => {
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, companyId: ctx.companyId, deletedAt: null },
        });
        if (!customer) throw new Error("Customer not found");
      }

      const productIds = [...new Set(parsed.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, companyId: ctx.companyId, deletedAt: null },
      });
      const productById = new Map(products.map((p) => [p.id, p]));
      for (const item of parsed.items) {
        if (!productById.has(item.productId)) throw new Error("One or more products were not found");
      }

      let subtotal = new Prisma.Decimal(0);
      const lineData = parsed.items.map((item) => {
        const product = productById.get(item.productId)!;
        const unitPrice = new Prisma.Decimal(item.unitPrice);
        const lineDiscount = new Prisma.Decimal(item.lineDiscount ?? 0);
        let lineTotal = unitPrice.times(item.qty).minus(lineDiscount);
        if (lineTotal.isNegative()) lineTotal = new Prisma.Decimal(0);
        subtotal = subtotal.plus(lineTotal);
        return {
          productId: item.productId,
          nameSnapshot: product.name,
          qty: item.qty,
          unitPrice,
          lineTotal,
          costSnapshot: product.costPrice,
        };
      });

      const billDiscount = new Prisma.Decimal(parsed.billDiscount ?? 0);
      const company = await tx.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { taxRate: true },
      });
      const afterDiscount = Prisma.Decimal.max(subtotal.minus(billDiscount), new Prisma.Decimal(0));
      const taxAmount = afterDiscount.times(company.taxRate).dividedBy(100);
      const total = afterDiscount.plus(taxAmount);

      const amountPaidNow = new Prisma.Decimal(parsed.amountPaidNow ?? 0);
      if (amountPaidNow.gt(total)) {
        throw new Error("Amount paid can't exceed the invoice total");
      }
      // Walk-in sales have no customer to carry a balance on — the client already
      // guards this, but re-check here since a server action must never trust it.
      if (!customerId && amountPaidNow.lt(total)) {
        throw new Error("Walk-in sales must be paid in full — attach a customer for credit/partial sales");
      }

      const invoiceNo = await nextInvoiceNo(tx, ctx.companyId);
      const status = deriveStatus(amountPaidNow, total);

      const invoice = await tx.invoice.create({
        data: {
          companyId: ctx.companyId,
          invoiceNo,
          customerId,
          type: parsed.type,
          status,
          subtotal,
          discount: billDiscount,
          taxAmount,
          total,
          paidAmount: amountPaidNow,
          note: parsed.note || null,
          createdBy: ctx.userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: lineData.map((l) => ({
          invoiceId: invoice.id,
          productId: l.productId,
          nameSnapshot: l.nameSnapshot,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          costSnapshot: l.costSnapshot,
        })),
      });

      // Aggregate by product first — a cart can carry the same product on more than one
      // line — so each product is locked, checked, and decremented exactly once no matter
      // how many lines it appears on.
      const qtyByProduct = new Map<string, number>();
      for (const item of parsed.items) {
        qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
      }
      const uniqueProductIds = [...qtyByProduct.keys()];

      // One round trip locks every affected row (same SELECT ... FOR UPDATE pattern used
      // for invoice numbering and returns) instead of one per cart line. The lock is held
      // until this transaction commits or rolls back, so nothing else can change these
      // rows between this check and the bulk decrement below — the oversell check stays
      // exactly as atomic as the old per-item updateMany, just batched.
      const lockedProducts = await tx.$queryRaw<{ id: string; stockQty: number }[]>`
        SELECT id, "stockQty" FROM "Product"
        WHERE id = ANY(${uniqueProductIds}::text[]) AND "companyId" = ${ctx.companyId}
        FOR UPDATE
      `;
      const stockById = new Map(lockedProducts.map((p) => [p.id, p.stockQty]));
      for (const productId of uniqueProductIds) {
        const required = qtyByProduct.get(productId)!;
        const available = stockById.get(productId) ?? 0;
        if (available < required) {
          throw new Error(`Not enough stock for ${productById.get(productId)!.name}`);
        }
      }

      const qtyArray = uniqueProductIds.map((id) => qtyByProduct.get(id)!);
      await tx.$executeRaw`
        UPDATE "Product" AS p
        SET "stockQty" = p."stockQty" - v.qty
        FROM unnest(${uniqueProductIds}::text[], ${qtyArray}::int[]) AS v(id, qty)
        WHERE p.id = v.id AND p."companyId" = ${ctx.companyId}
      `;

      await tx.stockAdjustment.createMany({
        data: uniqueProductIds.map((productId) => ({
          companyId: ctx.companyId,
          productId,
          userId: ctx.userId,
          qtyChange: -qtyByProduct.get(productId)!,
          reason: "SALE" as const,
          refId: invoice.id,
        })),
      });

      if (customerId) {
        await tx.ledgerEntry.create({
          data: {
            companyId: ctx.companyId,
            customerId,
            userId: ctx.userId,
            type: "INVOICE",
            debit: total,
            credit: 0,
            refId: invoice.id,
            note: `Invoice ${invoiceNo}`,
          },
        });
      }

      if (amountPaidNow.gt(0)) {
        const payment = await tx.payment.create({
          data: {
            companyId: ctx.companyId,
            invoiceId: invoice.id,
            customerId,
            amount: amountPaidNow,
            method: parsed.paymentMethod ?? "CASH",
            createdBy: ctx.userId,
          },
        });

        if (customerId) {
          await tx.ledgerEntry.create({
            data: {
              companyId: ctx.companyId,
              customerId,
              userId: ctx.userId,
              type: "PAYMENT",
              debit: 0,
              credit: amountPaidNow,
              refId: payment.id,
              note: `Payment for ${invoiceNo}`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.impersonatedBy ?? ctx.userId,
          action: "invoice.create",
          entity: "Invoice",
          entityId: invoice.id,
          meta: { invoiceNo, total: total.toString(), type: parsed.type },
        },
      });

      return { id: invoice.id, invoiceNo };
    }, DEFAULT_TX_OPTIONS);
  } catch (error) {
    throw toUserFacingError(error, "The sale couldn't be completed due to a temporary issue — please try again.");
  }
}

export type CreateInvoiceResult =
  | { ok: true; id: string; invoiceNo: string }
  | { ok: false; error: string };

/**
 * POS-facing wrapper around createInvoice: returns a discriminated result instead of
 * throwing. Next.js strips a thrown Server Action error's message in production builds
 * (replaced with a generic "Server Components render" digest) — returning the message as
 * plain data instead means the cashier always sees the real reason a sale failed.
 */
export async function completeSale(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  try {
    const { id, invoiceNo } = await createInvoice(input);
    return { ok: true, id, invoiceNo };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong — please try again." };
  }
}

export async function recordInvoicePayment(invoiceId: string, input: RecordPaymentInput): Promise<void> {
  const ctx = await requireRole(...SALE_ROLES);
  const parsed = recordPaymentSchema.parse(input);
  const amount = new Prisma.Decimal(parsed.amount);

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, companyId: ctx.companyId, deletedAt: null },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (ctx.role === "CASHIER" && invoice.createdBy !== ctx.userId) {
        throw new Error("Forbidden");
      }

      const remaining = invoice.total.minus(invoice.paidAmount);
      if (amount.gt(remaining)) {
        throw new Error("Amount exceeds the remaining balance");
      }

      const newPaidAmount = invoice.paidAmount.plus(amount);
      const status = deriveStatus(newPaidAmount, invoice.total);

      // Optimistic conditional update: if a concurrent payment already changed paidAmount,
      // this WHERE no longer matches and we fail loudly instead of silently overpaying.
      const updated = await tx.invoice.updateMany({
        where: { id: invoiceId, companyId: ctx.companyId, paidAmount: invoice.paidAmount },
        data: { paidAmount: newPaidAmount, status },
      });
      if (updated.count === 0) {
        throw new Error("This invoice was just updated elsewhere — please retry");
      }

      const payment = await tx.payment.create({
        data: {
          companyId: ctx.companyId,
          invoiceId,
          customerId: invoice.customerId,
          amount,
          method: parsed.method,
          note: parsed.note || null,
          createdBy: ctx.userId,
        },
      });

      if (invoice.customerId) {
        await tx.ledgerEntry.create({
          data: {
            companyId: ctx.companyId,
            customerId: invoice.customerId,
            userId: ctx.userId,
            type: "PAYMENT",
            debit: 0,
            credit: amount,
            refId: payment.id,
            note: parsed.note || `Payment for ${invoice.invoiceNo}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.impersonatedBy ?? ctx.userId,
          action: "invoice.payment",
          entity: "Invoice",
          entityId: invoiceId,
          meta: { amount: amount.toString(), method: parsed.method, paymentId: payment.id },
        },
      });
    }, DEFAULT_TX_OPTIONS);
  } catch (error) {
    throw toUserFacingError(error, "The payment couldn't be recorded due to a temporary issue — please try again.");
  }
}
