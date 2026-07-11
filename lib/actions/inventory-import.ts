"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import {
  parseImportRow,
  MAX_IMPORT_ROWS,
  type ImportRowRaw,
  type ParsedProductRow,
} from "@/lib/validations/inventory-import";

const INVENTORY_ROLES = ["ADMIN", "MANAGER"] as const;

export interface ImportRowResult {
  index: number; // 0-based within the submitted data rows (header excluded)
  data: ParsedProductRow | null;
  errors: string[];
}

export interface ValidateImportResult {
  rows: ImportRowResult[];
  validCount: number;
  invalidCount: number;
}

export async function validateProductImport(rows: ImportRowRaw[]): Promise<ValidateImportResult> {
  const ctx = await requireRole(...INVENTORY_ROLES);

  if (rows.length === 0) throw new Error("The file has no data rows");
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Import is capped at ${MAX_IMPORT_ROWS} rows per file`);

  const existingProducts = await prisma.product.findMany({
    where: { companyId: ctx.companyId, deletedAt: null },
    select: { sku: true },
  });
  const existingSkus = new Set(existingProducts.map((p) => p.sku));

  const firstSeenAtRow = new Map<string, number>(); // sku -> first data-row index it appeared at
  const results: ImportRowResult[] = rows.map((raw, index) => {
    const { data, errors } = parseImportRow(raw);
    if (data) {
      if (existingSkus.has(data.sku)) {
        errors.push("SKU already exists for another product");
      } else if (firstSeenAtRow.has(data.sku)) {
        errors.push(`Duplicate SKU — also used in row ${firstSeenAtRow.get(data.sku)! + 2}`);
      } else {
        firstSeenAtRow.set(data.sku, index);
      }
    }
    return { index, data: errors.length === 0 ? data : null, errors };
  });

  const validCount = results.filter((r) => r.data !== null).length;
  return { rows: results, validCount, invalidCount: results.length - validCount };
}

export interface ImportProductsResult {
  createdCount: number;
  categoriesCreated: number;
}

export async function importProducts(rows: ParsedProductRow[]): Promise<ImportProductsResult> {
  const ctx = await requireRole(...INVENTORY_ROLES);

  if (rows.length === 0) throw new Error("No valid rows to import");
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Import is capped at ${MAX_IMPORT_ROWS} rows per file`);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const existingCategories = await tx.category.findMany({
          where: { companyId: ctx.companyId },
          select: { id: true, name: true },
        });
        const categoryIdByLowerName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));
        let categoriesCreated = 0;

        for (const row of rows) {
          if (!row.categoryName) continue;
          const key = row.categoryName.toLowerCase();
          if (!categoryIdByLowerName.has(key)) {
            const created = await tx.category.create({ data: { companyId: ctx.companyId, name: row.categoryName } });
            categoryIdByLowerName.set(key, created.id);
            categoriesCreated += 1;
          }
        }

        let createdCount = 0;
        for (const row of rows) {
          const categoryId = row.categoryName ? categoryIdByLowerName.get(row.categoryName.toLowerCase())! : null;

          const product = await tx.product.create({
            data: {
              companyId: ctx.companyId,
              name: row.name,
              sku: row.sku,
              barcode: row.barcode,
              categoryId,
              unit: row.unit,
              costPrice: row.costPrice,
              salePrice: row.salePrice,
              reorderLevel: row.reorderLevel,
              stockQty: 0,
            },
          });

          if (row.stockQty > 0) {
            await tx.stockAdjustment.create({
              data: {
                companyId: ctx.companyId,
                productId: product.id,
                userId: ctx.userId,
                qtyChange: row.stockQty,
                reason: "OPENING",
                note: "Opening stock via CSV/XLSX import",
              },
            });
            await tx.product.update({ where: { id: product.id }, data: { stockQty: row.stockQty } });
          }

          await tx.auditLog.create({
            data: {
              companyId: ctx.companyId,
              userId: ctx.impersonatedBy ?? ctx.userId,
              action: "product.create",
              entity: "Product",
              entityId: product.id,
              meta: { sku: row.sku, name: row.name, source: "csv_import" },
            },
          });

          createdCount += 1;
        }

        return { createdCount, categoriesCreated };
      },
      // A 500-row import can run well past Prisma's 5s default interactive-transaction
      // timeout (each row is several sequential queries) — this is still one atomic
      // transaction, just given more room to complete before an automatic rollback.
      { timeout: 60_000, maxWait: 10_000 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("One of the rows has a SKU that was just taken by another change — please re-validate and try again");
    }
    throw error;
  }
}
