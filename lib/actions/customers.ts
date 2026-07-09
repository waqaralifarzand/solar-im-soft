"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import {
  customerSchema,
  createCustomerSchema,
  manualLedgerEntrySchema,
  receivePaymentSchema,
  supplierSchema,
  type CustomerInput,
  type CreateCustomerInput,
  type ManualLedgerEntryInput,
  type ReceivePaymentInput,
  type SupplierInput,
} from "@/lib/validations/customers";

const CUSTOMER_ROLES = ["ADMIN", "MANAGER"] as const;

export async function createCustomer(input: CreateCustomerInput): Promise<{ id: string }> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const parsed = createCustomerSchema.parse(input);

  const customerId = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        companyId: ctx.companyId,
        name: parsed.name,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        openingBalance: parsed.openingBalance,
      },
    });

    if (parsed.openingBalance > 0) {
      await tx.ledgerEntry.create({
        data: {
          companyId: ctx.companyId,
          customerId: customer.id,
          userId: ctx.userId,
          type: "OPENING",
          debit: parsed.openingBalance,
          credit: 0,
          note: "Opening balance",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "customer.create",
        entity: "Customer",
        entityId: customer.id,
        meta: { name: parsed.name, openingBalance: parsed.openingBalance },
      },
    });

    return customer.id;
  });

  return { id: customerId };
}

export async function updateCustomer(customerId: string, input: CustomerInput): Promise<void> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const parsed = customerSchema.parse(input);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!customer) throw new Error("Customer not found");

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.name,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "customer.update",
      entity: "Customer",
      entityId: customerId,
      meta: { name: parsed.name },
    },
  });

  revalidatePath("/customers");
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!customer) throw new Error("Customer not found");

  await prisma.customer.update({
    where: { id: customerId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "customer.delete",
      entity: "Customer",
      entityId: customerId,
      meta: { name: customer.name },
    },
  });

  revalidatePath("/customers");
}

export async function createManualLedgerEntry(input: ManualLedgerEntryInput): Promise<void> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const parsed = manualLedgerEntrySchema.parse(input);

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.customerId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!customer) throw new Error("Customer not found");

  const isDebit = parsed.type === "MANUAL_DEBIT";

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        companyId: ctx.companyId,
        customerId: parsed.customerId,
        userId: ctx.userId,
        type: parsed.type,
        debit: isDebit ? parsed.amount : 0,
        credit: isDebit ? 0 : parsed.amount,
        note: parsed.note,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: isDebit ? "ledger.manual_debit" : "ledger.manual_credit",
        entity: "LedgerEntry",
        entityId: parsed.customerId,
        meta: { customerName: customer.name, amount: parsed.amount, note: parsed.note },
      },
    });
  });
}

export async function receivePayment(input: ReceivePaymentInput): Promise<void> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const parsed = receivePaymentSchema.parse(input);

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.customerId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!customer) throw new Error("Customer not found");

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        companyId: ctx.companyId,
        customerId: parsed.customerId,
        invoiceId: null,
        amount: parsed.amount,
        method: parsed.method,
        note: parsed.note || null,
        createdBy: ctx.userId,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        companyId: ctx.companyId,
        customerId: parsed.customerId,
        userId: ctx.userId,
        type: "PAYMENT",
        debit: 0,
        credit: parsed.amount,
        refId: payment.id,
        note: parsed.note || `Payment received via ${parsed.method.replace("_", " ").toLowerCase()}`,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "payment.receive",
        entity: "Payment",
        entityId: payment.id,
        meta: {
          customerName: customer.name,
          amount: parsed.amount,
          method: parsed.method,
        },
      },
    });
  });
}

export async function createSupplier(input: SupplierInput): Promise<{ id: string }> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const parsed = supplierSchema.parse(input);

  const supplier = await prisma.supplier.create({
    data: {
      companyId: ctx.companyId,
      name: parsed.name,
      phone: parsed.phone || null,
      address: parsed.address || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "supplier.create",
      entity: "Supplier",
      entityId: supplier.id,
      meta: { name: parsed.name },
    },
  });

  return { id: supplier.id };
}

export async function updateSupplier(supplierId: string, input: SupplierInput): Promise<void> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const parsed = supplierSchema.parse(input);

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!supplier) throw new Error("Supplier not found");

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: parsed.name,
      phone: parsed.phone || null,
      address: parsed.address || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "supplier.update",
      entity: "Supplier",
      entityId: supplierId,
      meta: { name: parsed.name },
    },
  });

  revalidatePath("/suppliers");
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  const ctx = await requireRole(...CUSTOMER_ROLES);
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!supplier) throw new Error("Supplier not found");

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "supplier.delete",
      entity: "Supplier",
      entityId: supplierId,
      meta: { name: supplier.name },
    },
  });

  revalidatePath("/suppliers");
}
