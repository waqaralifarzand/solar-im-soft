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
  data: { name: string; salePrice: number; stockQty: number; sku?: string },
) {
  const suffix = uniqueSuffix();
  return prisma.product.create({
    data: {
      companyId,
      name: data.name,
      sku: data.sku ?? `SKU-${suffix}`,
      unit: "pcs",
      costPrice: data.salePrice * 0.7,
      salePrice: data.salePrice,
      stockQty: data.stockQty,
      reorderLevel: 5,
    },
  });
}

export async function createTestCustomer(companyId: string, name: string, openingBalance = 0) {
  const suffix = uniqueSuffix();
  return prisma.customer.create({
    data: { companyId, name: `${name} ${suffix}`, openingBalance },
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
  opts: { customerId?: string | null; createdBy: string; items: { productId: string; qty: number; unitPrice: number }[] },
) {
  const total = opts.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      invoiceNo: `INV-TEST-${uniqueSuffix()}`,
      customerId: opts.customerId ?? null,
      type: "STANDARD",
      status: "PAID",
      subtotal: total,
      discount: 0,
      taxAmount: 0,
      total,
      paidAmount: total,
      createdBy: opts.createdBy,
      items: {
        create: opts.items.map((i) => ({
          productId: i.productId,
          nameSnapshot: "Test Item",
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: i.qty * i.unitPrice,
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
