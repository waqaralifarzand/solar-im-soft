import { z } from "zod";
import { invoiceItemInputSchema } from "@/lib/validations/invoices";

export { invoiceItemInputSchema as quotationItemInputSchema };

export const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "CONVERTED", "EXPIRED", "REJECTED"] as const;

export const createQuotationSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  customerNameFree: z.string().max(160).optional().or(z.literal("")),
  items: z.array(invoiceItemInputSchema).min(1, "Add at least one item"),
  billDiscount: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Discount can't be negative").default(0),
  validUntil: z.string().optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const MANUAL_QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "EXPIRED", "REJECTED"] as const;

export const updateQuotationStatusSchema = z.object({
  status: z.enum(MANUAL_QUOTE_STATUSES),
});
export type UpdateQuotationStatusInput = z.infer<typeof updateQuotationStatusSchema>;
