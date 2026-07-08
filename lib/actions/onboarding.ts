"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import {
  companyNameSchema,
  brandingSchema,
  taxCurrencySchema,
  invoiceNotesSchema,
  type CompanyNameInput,
  type BrandingInput,
  type TaxCurrencyInput,
  type InvoiceNotesInput,
} from "@/lib/validations/onboarding";

export async function updateCompanyName(input: CompanyNameInput): Promise<void> {
  const ctx = await requireRole("ADMIN");
  const parsed = companyNameSchema.parse(input);
  await prisma.company.update({ where: { id: ctx.companyId }, data: { name: parsed.name } });
}

export async function updateBranding(input: BrandingInput): Promise<void> {
  const ctx = await requireRole("ADMIN");
  const parsed = brandingSchema.parse(input);
  await prisma.company.update({
    where: { id: ctx.companyId },
    data: {
      accentColor: parsed.accentColor,
      ...(parsed.logoUrl !== undefined ? { logoUrl: parsed.logoUrl } : {}),
    },
  });
}

export async function updateTaxCurrency(input: TaxCurrencyInput): Promise<void> {
  const ctx = await requireRole("ADMIN");
  const parsed = taxCurrencySchema.parse(input);
  await prisma.company.update({
    where: { id: ctx.companyId },
    data: { taxRate: parsed.taxRate, currency: parsed.currency, lakhCroreFormat: parsed.lakhCroreFormat },
  });
}

export async function updateInvoiceNotes(input: InvoiceNotesInput): Promise<void> {
  const ctx = await requireRole("ADMIN");
  const parsed = invoiceNotesSchema.parse(input);
  await prisma.company.update({
    where: { id: ctx.companyId },
    data: {
      invoiceHeaderNote: parsed.invoiceHeaderNote || null,
      invoiceFooterNote: parsed.invoiceFooterNote || null,
    },
  });
}

export async function completeOnboarding(): Promise<void> {
  const ctx = await requireRole("ADMIN");
  await prisma.company.update({ where: { id: ctx.companyId }, data: { onboardingComplete: true } });
}
