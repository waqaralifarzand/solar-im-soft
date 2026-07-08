"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { suggestSku as suggestSkuQuery } from "@/lib/queries/inventory";
import {
  categorySchema,
  createProductSchema,
  productSchema,
  stockAdjustmentSchema,
  type CategoryInput,
  type CreateProductInput,
  type ProductInput,
  type StockAdjustmentInput,
} from "@/lib/validations/inventory";

const INVENTORY_ROLES = ["ADMIN", "MANAGER"] as const;

export async function suggestSkuAction(categoryId: string | null): Promise<string> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  return suggestSkuQuery(ctx.companyId, categoryId || null);
}

export async function createCategory(input: CategoryInput): Promise<{ id: string }> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const parsed = categorySchema.parse(input);

  let category;
  try {
    category = await prisma.category.create({ data: { companyId: ctx.companyId, name: parsed.name } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A category with this name already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "category.create",
      entity: "Category",
      entityId: category.id,
      meta: { name: parsed.name },
    },
  });

  return { id: category.id };
}

export async function updateCategory(categoryId: string, input: CategoryInput): Promise<void> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const parsed = categorySchema.parse(input);

  const category = await prisma.category.findFirst({ where: { id: categoryId, companyId: ctx.companyId } });
  if (!category) throw new Error("Category not found");

  try {
    await prisma.category.update({ where: { id: categoryId }, data: { name: parsed.name } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A category with this name already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "category.update",
      entity: "Category",
      entityId: categoryId,
      meta: { name: parsed.name },
    },
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const category = await prisma.category.findFirst({ where: { id: categoryId, companyId: ctx.companyId } });
  if (!category) throw new Error("Category not found");

  // Product.categoryId -> Category is ON DELETE SET NULL, so referencing products just lose their category.
  await prisma.category.delete({ where: { id: categoryId } });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "category.delete",
      entity: "Category",
      entityId: categoryId,
      meta: { name: category.name },
    },
  });
}

export async function createProduct(input: CreateProductInput): Promise<{ id: string }> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const parsed = createProductSchema.parse(input);

  let productId: string;
  try {
    productId = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          companyId: ctx.companyId,
          name: parsed.name,
          sku: parsed.sku,
          barcode: parsed.barcode || null,
          categoryId: parsed.categoryId || null,
          description: parsed.description || null,
          unit: parsed.unit,
          costPrice: parsed.costPrice,
          salePrice: parsed.salePrice,
          reorderLevel: parsed.reorderLevel,
          stockQty: 0,
        },
      });

      if (parsed.openingStockQty > 0) {
        await tx.stockAdjustment.create({
          data: {
            companyId: ctx.companyId,
            productId: product.id,
            userId: ctx.userId,
            qtyChange: parsed.openingStockQty,
            reason: "OPENING",
            note: "Opening stock on product creation",
          },
        });
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: parsed.openingStockQty },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.impersonatedBy ?? ctx.userId,
          action: "product.create",
          entity: "Product",
          entityId: product.id,
          meta: { sku: parsed.sku, name: parsed.name },
        },
      });

      return product.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A product with this SKU already exists");
    }
    throw error;
  }

  return { id: productId };
}

export async function updateProduct(productId: string, input: ProductInput): Promise<void> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const parsed = productSchema.parse(input);

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!product) throw new Error("Product not found");

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: parsed.name,
        sku: parsed.sku,
        barcode: parsed.barcode || null,
        categoryId: parsed.categoryId || null,
        description: parsed.description || null,
        unit: parsed.unit,
        costPrice: parsed.costPrice,
        salePrice: parsed.salePrice,
        reorderLevel: parsed.reorderLevel,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A product with this SKU already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "product.update",
      entity: "Product",
      entityId: productId,
      meta: { sku: parsed.sku, name: parsed.name },
    },
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!product) throw new Error("Product not found");

  await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "product.delete",
      entity: "Product",
      entityId: productId,
      meta: { sku: product.sku, name: product.name },
    },
  });
}

export async function createStockAdjustment(input: StockAdjustmentInput): Promise<void> {
  const ctx = await requireRole(...INVENTORY_ROLES);
  const parsed = stockAdjustmentSchema.parse(input);

  const product = await prisma.product.findFirst({
    where: { id: parsed.productId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!product) throw new Error("Product not found");

  await prisma.$transaction(async (tx) => {
    // Atomic floor-at-zero: the WHERE clause requires the *current* stock to already
    // cover the decrease, so a concurrent adjustment can't push it negative between
    // the check and the write.
    const updated = await tx.product.updateMany({
      where: { id: parsed.productId, companyId: ctx.companyId, stockQty: { gte: -parsed.qtyChange } },
      data: { stockQty: { increment: parsed.qtyChange } },
    });
    if (updated.count === 0) {
      throw new Error("That adjustment would take stock below zero");
    }

    await tx.stockAdjustment.create({
      data: {
        companyId: ctx.companyId,
        productId: parsed.productId,
        userId: ctx.userId,
        qtyChange: parsed.qtyChange,
        reason: parsed.reason,
        note: parsed.note || null,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.impersonatedBy ?? ctx.userId,
        action: "stock.adjust",
        entity: "Product",
        entityId: parsed.productId,
        meta: { qtyChange: parsed.qtyChange, reason: parsed.reason, sku: product.sku },
      },
    });
  });
}
