import { z } from "zod";

export const PO_STATUSES = ["DRAFT", "ORDERED", "RECEIVED"] as const;

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  qty: z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Quantity must be a whole number").positive("Quantity must be at least 1"),
  unitCost: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Cost can't be negative"),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Pick a supplier"),
  items: z.array(purchaseItemInputSchema).min(1, "Add at least one item"),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

// RECEIVED is only ever set by receivePurchaseOrder, never picked manually.
export const MANUAL_PO_STATUSES = ["DRAFT", "ORDERED"] as const;

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(MANUAL_PO_STATUSES),
});
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;

export const receivePurchaseOrderSchema = z.object({
  updateCostPriceProductIds: z.array(z.string()).default([]),
});
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
