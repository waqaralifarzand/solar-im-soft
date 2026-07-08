import { prisma } from "@/lib/prisma";

export async function listCategories(companyId: string) {
  const categories = await prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, productCount: c._count.products }));
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unit: string;
  costPrice: string;
  salePrice: string;
  stockQty: number;
  reorderLevel: number;
  lowStock: boolean;
}

export async function listProductsForCompany(companyId: string): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { category: { select: { name: true } } },
  });
  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    unit: p.unit,
    costPrice: p.costPrice.toString(),
    salePrice: p.salePrice.toString(),
    stockQty: p.stockQty,
    reorderLevel: p.reorderLevel,
    lowStock: p.stockQty <= p.reorderLevel,
  }));
}

export async function getProductDetail(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) return null;

  const adjustments = await prisma.stockAdjustment.findMany({
    where: { companyId, productId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const userIds = [...new Set(adjustments.map((a) => a.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return {
    product,
    adjustments: adjustments.map((a) => ({ ...a, userName: userById.get(a.userId) ?? "Unknown" })),
  };
}

export interface AdjustmentRow {
  id: string;
  createdAt: Date;
  productName: string;
  productSku: string;
  qtyChange: number;
  reason: string;
  note: string | null;
  userName: string;
}

export async function listAllAdjustments(companyId: string): Promise<AdjustmentRow[]> {
  const adjustments = await prisma.stockAdjustment.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { name: true, sku: true } } },
  });
  const userIds = [...new Set(adjustments.map((a) => a.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return adjustments.map((a) => ({
    id: a.id,
    createdAt: a.createdAt,
    productName: a.product.name,
    productSku: a.product.sku,
    qtyChange: a.qtyChange,
    reason: a.reason,
    note: a.note,
    userName: userById.get(a.userId) ?? "Unknown",
  }));
}

/** Category-name-prefix + incrementing-number SKU suggestion, unique per company. */
export async function suggestSku(companyId: string, categoryId: string | null): Promise<string> {
  let prefix = "PRD";
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, companyId } });
    if (category) {
      const alnum = category.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (alnum.length > 0) prefix = alnum.slice(0, 3).padEnd(3, "X");
    }
  }

  const existing = await prisma.product.findMany({
    where: { companyId, sku: { startsWith: `${prefix}-` } },
    select: { sku: true },
  });

  let maxNumber = 0;
  for (const { sku } of existing) {
    const suffix = sku.slice(prefix.length + 1);
    const num = Number.parseInt(suffix, 10);
    if (Number.isFinite(num) && num > maxNumber) maxNumber = num;
  }

  return `${prefix}-${String(maxNumber + 1).padStart(4, "0")}`;
}
