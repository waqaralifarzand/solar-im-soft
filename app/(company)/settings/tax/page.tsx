import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { TaxCurrencyForm } from "@/components/settings/tax-currency-form";

export const dynamic = "force-dynamic";

export default async function TaxSettingsPage() {
  const ctx = await getTenantContext();
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: { taxRate: true, currency: true, lakhCroreFormat: true },
  });

  return (
    <TaxCurrencyForm
      initialTaxRate={company.taxRate.toString()}
      initialCurrency={company.currency}
      initialLakhCroreFormat={company.lakhCroreFormat}
    />
  );
}
