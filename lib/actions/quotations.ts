"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { nextQuoteNo } from "@/lib/generateQuoteNo";
import { createInvoice } from "@/lib/actions/invoices";
import {
  createQuotationSchema,
  updateQuotationStatusSchema,
  type CreateQuotationInput,
  type UpdateQuotationStatusInput,
} from "@/lib/validations/quotations";

const QUOTE_ROLES = ["ADMIN", "MANAGER"] as const;

export async function createQuotation(input: CreateQuotationInput): Promise<{ id: string; quoteNo: string }> {
  const ctx = await requireRole(...QUOTE_ROLES);
  const parsed = createQuotationSchema.parse(input);
  const customerId = parsed.customerId || null;

  return prisma.$transaction(async (tx) => {
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
      return { productId: item.productId, nameSnapshot: product.name, qty: item.qty, unitPrice, lineTotal };
    });

    const billDiscount = new Prisma.Decimal(parsed.billDiscount ?? 0);
    const company = await tx.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { taxRate: true },
    });
    const afterDiscount = Prisma.Decimal.max(subtotal.minus(billDiscount), new Prisma.Decimal(0));
    const taxAmount = afterDiscount.times(company.taxRate).dividedBy(100);
    const total = afterDiscount.plus(taxAmount);

    const quoteNo = await nextQuoteNo(tx, ctx.companyId);

    const quotation = await tx.quotation.create({
      data: {
        companyId: ctx.companyId,
        quoteNo,
        customerId,
        customerNameFree: customerId ? null : parsed.customerNameFree || null,
        status: "DRAFT",
        subtotal,
        discount: billDiscount,
        taxAmount,
        total,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        note: parsed.note || null,
        createdBy: ctx.userId,
      },
    });

    await tx.quotationItem.createMany({
      data: lineData.map((l) => ({
        quotationId: quotation.id,
        productId: l.productId,
        nameSnapshot: l.nameSnapshot,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    });

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "quotation.create",
        entity: "Quotation",
        entityId: quotation.id,
        meta: { quoteNo, total: total.toString() },
      },
    });

    return { id: quotation.id, quoteNo };
  });
}

export async function updateQuotationStatus(quotationId: string, input: UpdateQuotationStatusInput): Promise<void> {
  const ctx = await requireRole(...QUOTE_ROLES);
  const parsed = updateQuotationStatusSchema.parse(input);

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, companyId: ctx.companyId },
  });
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "CONVERTED") {
    throw new Error("This quotation has already been converted and its status can't change");
  }

  await prisma.$transaction([
    prisma.quotation.update({ where: { id: quotationId }, data: { status: parsed.status } }),
    prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "quotation.status_change",
        entity: "Quotation",
        entityId: quotationId,
        meta: { from: quotation.status, to: parsed.status },
      },
    }),
  ]);
}

export async function convertQuotationToInvoice(
  quotationId: string,
): Promise<{ invoiceId: string; invoiceNo: string }> {
  const ctx = await requireRole(...QUOTE_ROLES);

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, companyId: ctx.companyId },
    include: { items: true },
  });
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "CONVERTED") throw new Error("This quotation has already been converted");
  if (!quotation.customerId) {
    throw new Error("Attach a saved customer before converting — a free-text-name quote can't carry an unpaid balance");
  }

  // Reverse-derive each line's lineDiscount so createInvoice reproduces the exact same
  // lineTotal the quote already promised the customer, then run the real sales-engine
  // transaction unchanged (oversell is still checked, stock still decrements here for
  // the first time — quotes themselves never touch stock).
  const items = quotation.items.map((it) => {
    if (!it.productId) {
      throw new Error("This quotation has a line item with no linked product and can't be converted");
    }
    const lineDiscount = Prisma.Decimal.max(
      new Prisma.Decimal(it.qty).times(it.unitPrice).minus(it.lineTotal),
      new Prisma.Decimal(0),
    );
    return {
      productId: it.productId,
      qty: it.qty,
      unitPrice: it.unitPrice.toNumber(),
      lineDiscount: lineDiscount.toNumber(),
    };
  });

  const invoice = await createInvoice({
    type: "STANDARD",
    customerId: quotation.customerId,
    items,
    billDiscount: quotation.discount.toNumber(),
    amountPaidNow: 0,
    note: quotation.note ?? undefined,
  });

  await prisma.$transaction([
    prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "CONVERTED", convertedInvoiceId: invoice.id },
    }),
    prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "quotation.convert",
        entity: "Quotation",
        entityId: quotationId,
        meta: { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo },
      },
    }),
  ]);

  return { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo };
}
