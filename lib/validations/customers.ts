import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(160),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .max(160)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  address: z.string().max(500).optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const createCustomerSchema = customerSchema.extend({
  openingBalance: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .min(0, "Opening balance can't be negative"),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const MANUAL_LEDGER_TYPES = ["MANUAL_DEBIT", "MANUAL_CREDIT"] as const;

export const manualLedgerEntrySchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  type: z.enum(MANUAL_LEDGER_TYPES),
  amount: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  note: z.string().max(500).optional().or(z.literal("")),
});
export type ManualLedgerEntryInput = z.infer<typeof manualLedgerEntrySchema>;

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "JAZZCASH",
  "EASYPAISA",
  "CHEQUE",
  "OTHER",
] as const;

export const receivePaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(500).optional().or(z.literal("")),
});
export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
