import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { BrandingForm } from "@/components/settings/branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  const ctx = await getTenantContext();
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: {
      name: true,
      logoUrl: true,
      accentColor: true,
      invoiceHeaderNote: true,
      invoiceFooterNote: true,
    },
  });

  return (
    <BrandingForm
      companyName={company.name}
      initialLogoUrl={company.logoUrl}
      initialAccentColor={company.accentColor}
      initialHeaderNote={company.invoiceHeaderNote ?? ""}
      initialFooterNote={company.invoiceFooterNote ?? ""}
    />
  );
}
