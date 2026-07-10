import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export const prisma = new PrismaClient();

const TEST_PASSWORD = "Test1234!";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTestCompany(opts: { name: string; taxRate?: number }) {
  const suffix = uniqueSuffix();
  return prisma.company.create({
    data: {
      name: `${opts.name} ${suffix}`,
      slug: `${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`,
      status: "ACTIVE",
      onboardingComplete: true,
      taxRate: opts.taxRate ?? 0,
      currency: "PKR",
      lakhCroreFormat: true,
    },
  });
}

export async function createTestUser(companyId: string, role: Role, label: string) {
  const suffix = uniqueSuffix();
  const email = `${label}-${suffix}@test.local`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.create({
    data: { companyId, name: label, email, passwordHash, role, status: "ACTIVE" },
  });
  return { id: user.id, email, password: TEST_PASSWORD };
}

export async function createTestProduct(
  companyId: string,
  data: { name: string; salePrice: number; stockQty: number; sku?: string; costPrice?: number; reorderLevel?: number },
) {
  const suffix = uniqueSuffix();
  return prisma.product.create({
    data: {
      companyId,
      name: data.name,
      sku: data.sku ?? `SKU-${suffix}`,
      unit: "pcs",
      costPrice: data.costPrice ?? data.salePrice * 0.7,
      salePrice: data.salePrice,
      stockQty: data.stockQty,
      reorderLevel: data.reorderLevel ?? 5,
    },
  });
}

export async function createTestCustomer(companyId: string, name: string, openingBalance = 0) {
  const suffix = uniqueSuffix();
  return prisma.customer.create({
    data: { companyId, name: `${name} ${suffix}`, openingBalance },
  });
}

export async function createTestSupplier(companyId: string, name: string) {
  const suffix = uniqueSuffix();
  return prisma.supplier.create({
    data: { companyId, name: `${name} ${suffix}` },
  });
}

export async function getProductStock(productId: string): Promise<number> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return product.stockQty;
}

/**
 * Creates an invoice directly (bypassing the createInvoice action/UI, which Phase 5A/5B
 * already test thoroughly) so quotation-conversion and returns tests can set up a known
 * "already sold" state fast. Mirrors the real transaction's shape closely enough for
 * realistic assertions: writes a LedgerEntry(INVOICE, debit=total) when a customer is
 * attached, same as createInvoice does.
 */
export async function createTestInvoice(
  companyId: string,
  opts: {
    customerId?: string | null;
    createdBy: string;
    items: { productId: string; qty: number; unitPrice: number; costSnapshot?: number }[];
    discount?: number;
    taxAmount?: number;
    status?: "PAID" | "PARTIAL" | "UNPAID";
    paidAmount?: number;
  },
) {
  const subtotal = opts.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const discount = opts.discount ?? 0;
  const taxAmount = opts.taxAmount ?? 0;
  const total = subtotal - discount + taxAmount;
  const status = opts.status ?? "PAID";
  const paidAmount = opts.paidAmount ?? (status === "PAID" ? total : 0);
  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNo: `INV-TEST-${uniqueSuffix()}`,
      customerId: opts.customerId ?? null,
      type: "STANDARD",
      status,
      subtotal,
      discount,
      taxAmount,
      total,
      paidAmount,
      createdBy: opts.createdBy,
      items: {
        create: opts.items.map((i) => ({
          productId: i.productId,
          nameSnapshot: "Test Item",
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: i.qty * i.unitPrice,
          costSnapshot: i.costSnapshot ?? 0,
        })),
      },
    },
  });

  if (opts.customerId) {
    await prisma.ledgerEntry.create({
      data: {
        companyId,
        customerId: opts.customerId,
        userId: opts.createdBy,
        type: "INVOICE",
        debit: total,
        credit: 0,
        refId: invoice.id,
        note: `Invoice ${invoice.invoiceNo}`,
      },
    });
  }

  return invoice;
}

/**
 * Mirrors createReturn's transaction shape (Return + ReturnItems + optional restock +
 * optional ledger credit) so report/profit-report tests can seed a known return fast,
 * without driving the Return UI through a real browser.
 */
export async function createTestReturn(
  companyId: string,
  opts: {
    invoiceId: string;
    customerId?: string | null;
    createdBy: string;
    restock?: boolean;
    items: { productId: string; qty: number; unitPrice: number }[];
  },
) {
  const total = opts.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const restock = opts.restock ?? true;

  const ret = await prisma.return.create({
    data: {
      companyId,
      invoiceId: opts.invoiceId,
      total,
      restock,
      createdBy: opts.createdBy,
      items: {
        create: opts.items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })),
      },
    },
  });

  if (restock) {
    for (const item of opts.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.qty } },
      });
      await prisma.stockAdjustment.create({
        data: {
          companyId,
          productId: item.productId,
          userId: opts.createdBy,
          qtyChange: item.qty,
          reason: "RETURN",
          refId: ret.id,
        },
      });
    }
  }

  if (opts.customerId) {
    await prisma.ledgerEntry.create({
      data: {
        companyId,
        customerId: opts.customerId,
        userId: opts.createdBy,
        type: "RETURN",
        debit: 0,
        credit: total,
        refId: ret.id,
        note: `Return for test invoice`,
      },
    });
  }

  return ret;
}

export async function createTestExpense(
  companyId: string,
  opts: { createdBy: string; category: string; amount: number; date: Date; note?: string },
) {
  return prisma.expense.create({
    data: {
      companyId,
      category: opts.category,
      amount: opts.amount,
      note: opts.note ?? null,
      date: opts.date,
      createdBy: opts.createdBy,
    },
  });
}
