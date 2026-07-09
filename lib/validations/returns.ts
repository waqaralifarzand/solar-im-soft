import { z } from "zod";

export const returnItemInputSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  qty: z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Quantity must be a whole number").positive("Quantity must be at least 1"),
});
export type ReturnItemInput = z.infer<typeof returnItemInputSchema>;

export const createReturnSchema = z.object({
  invoiceId: z.string().min(1),
  items: z.array(returnItemInputSchema).min(1, "Select at least one item to return"),
  restock: z.boolean().default(true),
  note: z.string().max(500).optional().or(z.literal("")),
});
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
