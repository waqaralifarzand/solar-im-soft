import { z } from "zod";
import { LOGO_DATA_URL_PATTERN, MAX_LOGO_DATA_URL_LENGTH } from "@/lib/logo";

export const CURRENCIES = ["PKR", "INR", "USD", "AED", "SAR"] as const;

export const companyNameSchema = z.object({
  name: z.string().min(1, "Company name is required").max(120),
});
export type CompanyNameInput = z.infer<typeof companyNameSchema>;

export const brandingSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color like #111110"),
  logoUrl: z
    .string()
    .regex(LOGO_DATA_URL_PATTERN, "Logo must be a PNG, JPEG, or WEBP image")
    .max(MAX_LOGO_DATA_URL_LENGTH, "Logo image is too large")
    .nullable()
    .optional(),
});
export type BrandingInput = z.infer<typeof brandingSchema>;

export const taxCurrencySchema = z.object({
  taxRate: z.coerce.number().min(0, "Tax rate can't be negative").max(100, "Tax rate can't exceed 100%"),
  currency: z.enum(CURRENCIES),
  lakhCroreFormat: z.boolean(),
});
export type TaxCurrencyInput = z.infer<typeof taxCurrencySchema>;

export const invoiceNotesSchema = z.object({
  invoiceHeaderNote: z.string().max(500, "Keep it under 500 characters"),
  invoiceFooterNote: z.string().max(500, "Keep it under 500 characters"),
});
export type InvoiceNotesInput = z.infer<typeof invoiceNotesSchema>;

export const paymentDetailsSchema = z.object({
  bankName: z.string().max(120, "Keep it under 120 characters"),
  accountTitle: z.string().max(120, "Keep it under 120 characters"),
  accountNumber: z.string().max(60, "Keep it under 60 characters"),
  iban: z.string().max(60, "Keep it under 60 characters"),
  jazzCashNumber: z.string().max(30, "Keep it under 30 characters"),
  easyPaisaNumber: z.string().max(30, "Keep it under 30 characters"),
});
export type PaymentDetailsInput = z.infer<typeof paymentDetailsSchema>;
