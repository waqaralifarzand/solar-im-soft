"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { supplierSchema, type SupplierInput } from "@/lib/validations/suppliers";

const SUPPLIER_ROLES = ["ADMIN", "MANAGER"] as const;

export async function createSupplier(input: SupplierInput): Promise<{ id: string }> {
  const ctx = await requireRole(...SUPPLIER_ROLES);
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
  const ctx = await requireRole(...SUPPLIER_ROLES);
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
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  const ctx = await requireRole(...SUPPLIER_ROLES);

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
}
