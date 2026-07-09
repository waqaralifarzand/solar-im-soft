import { prisma } from "@/lib/prisma";

export interface QuotationRow {
  id: string;
  quoteNo: string;
  customerName: string | null;
  status: string;
  total: string;
  validUntil: Date | null;
  createdAt: Date;
  createdByName: string;
}

export async function listQuotations(companyId: string): Promise<QuotationRow[]> {
  const quotations = await prisma.quotation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  const userIds = [...new Set(quotations.map((q) => q.createdBy))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return quotations.map((q) => ({
    id: q.id,
    quoteNo: q.quoteNo,
    customerName: q.customer?.name ?? q.customerNameFree ?? null,
    status: q.status,
    total: q.total.toString(),
    validUntil: q.validUntil,
    createdAt: q.createdAt,
    createdByName: userById.get(q.createdBy) ?? "Unknown",
  }));
}

export interface QuotationDetail {
  id: string;
  quoteNo: string;
  status: string;
  subtotal: string;
  discount: string;
  taxAmount: string;
  total: string;
  validUntil: Date | null;
  note: string | null;
  createdAt: Date;
  createdByName: string;
  createdBy: string;
  customer: { id: string; name: string; phone: string | null } | null;
  customerNameFree: string | null;
  convertedInvoiceId: string | null;
  convertedInvoiceNo: string | null;
  items: {
    id: string;
    productId: string | null;
    nameSnapshot: string;
    qty: number;
    unitPrice: string;
    lineTotal: string;
  }[];
}

export async function getQuotationDetail(companyId: string, quotationId: string): Promise<QuotationDetail | null> {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, companyId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: true,
    },
  });
  if (!quotation) return null;

  const [creator, convertedInvoice] = await Promise.all([
    prisma.user.findUnique({ where: { id: quotation.createdBy }, select: { name: true } }),
    quotation.convertedInvoiceId
      ? prisma.invoice.findUnique({ where: { id: quotation.convertedInvoiceId }, select: { invoiceNo: true } })
      : Promise.resolve(null),
  ]);

  return {
    id: quotation.id,
    quoteNo: quotation.quoteNo,
    status: quotation.status,
    subtotal: quotation.subtotal.toString(),
    discount: quotation.discount.toString(),
    taxAmount: quotation.taxAmount.toString(),
    total: quotation.total.toString(),
    validUntil: quotation.validUntil,
    note: quotation.note,
    createdAt: quotation.createdAt,
    createdByName: creator?.name ?? "Unknown",
    createdBy: quotation.createdBy,
    customer: quotation.customer,
    customerNameFree: quotation.customerNameFree,
    convertedInvoiceId: quotation.convertedInvoiceId,
    convertedInvoiceNo: convertedInvoice?.invoiceNo ?? null,
    items: quotation.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      nameSnapshot: it.nameSnapshot,
      qty: it.qty,
      unitPrice: it.unitPrice.toString(),
      lineTotal: it.lineTotal.toString(),
    })),
  };
}

/**
 * Reverse lookup for the invoice detail page: Quotation.convertedInvoiceId is the only
 * stored link between a quote and the invoice it produced, so "linked both ways" is
 * achieved by querying from the invoice side rather than adding a column to Invoice.
 */
export async function getConvertedFromQuotation(
  companyId: string,
  invoiceId: string,
): Promise<{ id: string; quoteNo: string } | null> {
  return prisma.quotation.findFirst({
    where: { companyId, convertedInvoiceId: invoiceId },
    select: { id: true, quoteNo: true },
  });
}
