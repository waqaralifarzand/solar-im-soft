import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/validations/customers";

export { PAYMENT_METHODS };

export const INVOICE_TYPES = ["POS", "STANDARD"] as const;

export const invoiceItemInputSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  qty: z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Quantity must be a whole number").positive("Quantity must be at least 1"),
  unitPrice: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Price can't be negative"),
  lineDiscount: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Discount can't be negative").default(0),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const createInvoiceSchema = z
  .object({
    type: z.enum(INVOICE_TYPES).default("STANDARD"),
    customerId: z.string().optional().or(z.literal("")),
    items: z.array(invoiceItemInputSchema).min(1, "Add at least one item"),
    billDiscount: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Discount can't be negative").default(0),
    amountPaidNow: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).min(0, "Amount can't be negative").default(0),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    note: z.string().max(1000).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.amountPaidNow > 0 && !val.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick a payment method",
        path: ["paymentMethod"],
      });
    }
  });
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(500).optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const INVOICE_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
