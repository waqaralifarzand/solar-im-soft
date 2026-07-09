import { prisma } from "@/lib/prisma";

export interface PosProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  salePrice: string;
  stockQty: number;
}

export async function listProductsForSale(companyId: string): Promise<PosProduct[]> {
  const products = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    unit: p.unit,
    salePrice: p.salePrice.toString(),
    stockQty: p.stockQty,
  }));
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

export async function listCustomersForPicker(companyId: string): Promise<CustomerOption[]> {
  const customers = await prisma.customer.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
  return customers;
}

export interface InvoiceRow {
  id: string;
  invoiceNo: string;
  customerName: string | null;
  type: string;
  status: string;
  total: string;
  paidAmount: string;
  createdAt: Date;
  createdByName: string;
}

export async function listInvoices(companyId: string): Promise<InvoiceRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  const userIds = [...new Set(invoices.map((i) => i.createdBy))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return invoices.map((i) => ({
    id: i.id,
    invoiceNo: i.invoiceNo,
    customerName: i.customer?.name ?? null,
    type: i.type,
    status: i.status,
    total: i.total.toString(),
    paidAmount: i.paidAmount.toString(),
    createdAt: i.createdAt,
    createdByName: userById.get(i.createdBy) ?? "Unknown",
  }));
}

export interface InvoiceDetail {
  id: string;
  invoiceNo: string;
  type: string;
  status: string;
  subtotal: string;
  discount: string;
  taxAmount: string;
  total: string;
  paidAmount: string;
  note: string | null;
  createdAt: Date;
  createdByName: string;
  createdBy: string;
  customer: { id: string; name: string; phone: string | null } | null;
  items: {
    id: string;
    productId: string;
    nameSnapshot: string;
    qty: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  payments: {
    id: string;
    amount: string;
    method: string;
    note: string | null;
    createdAt: Date;
    createdByName: string;
  }[];
}

export async function getInvoiceDetail(companyId: string, invoiceId: string): Promise<InvoiceDetail | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) return null;

  const userIds = [...new Set([invoice.createdBy, ...invoice.payments.map((p) => p.createdBy)])];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    type: invoice.type,
    status: invoice.status,
    subtotal: invoice.subtotal.toString(),
    discount: invoice.discount.toString(),
    taxAmount: invoice.taxAmount.toString(),
    total: invoice.total.toString(),
    paidAmount: invoice.paidAmount.toString(),
    note: invoice.note,
    createdAt: invoice.createdAt,
    createdByName: userById.get(invoice.createdBy) ?? "Unknown",
    createdBy: invoice.createdBy,
    customer: invoice.customer,
    items: invoice.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      nameSnapshot: it.nameSnapshot,
      qty: it.qty,
      unitPrice: it.unitPrice.toString(),
      lineTotal: it.lineTotal.toString(),
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      method: p.method,
      note: p.note,
      createdAt: p.createdAt,
      createdByName: userById.get(p.createdBy) ?? "Unknown",
    })),
  };
}
