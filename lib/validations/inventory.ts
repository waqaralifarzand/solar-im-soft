import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(60),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(160),
  sku: z.string().min(1, "SKU is required").max(40),
  barcode: z.string().max(60).optional(),
  categoryId: z.string().optional(),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1, "Unit is required").max(20),
  costPrice: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Cost price can't be negative"),
  salePrice: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Sale price can't be negative"),
  reorderLevel: z.coerce
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level can't be negative"),
});
export type ProductInput = z.infer<typeof productSchema>;

export const createProductSchema = productSchema.extend({
  openingStockQty: z.coerce
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Opening stock must be a whole number")
    .min(0, "Opening stock can't be negative"),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const MANUAL_ADJUST_REASONS = ["MANUAL", "DAMAGE"] as const;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  qtyChange: z.coerce
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Quantity must be a whole number")
    .refine((v) => v !== 0, "Quantity change can't be zero"),
  reason: z.enum(MANUAL_ADJUST_REASONS),
  note: z.string().max(500).optional(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
