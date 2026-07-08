import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: {
      name: true,
      logoUrl: true,
      accentColor: true,
      taxRate: true,
      currency: true,
      lakhCroreFormat: true,
      invoiceHeaderNote: true,
      invoiceFooterNote: true,
      onboardingComplete: true,
    },
  });

  if (company.onboardingComplete) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <OnboardingWizard
        initialName={company.name}
        initialLogoUrl={company.logoUrl}
        initialAccentColor={company.accentColor}
        initialTaxRate={company.taxRate.toString()}
        initialCurrency={company.currency}
        initialLakhCroreFormat={company.lakhCroreFormat}
        initialHeaderNote={company.invoiceHeaderNote ?? ""}
        initialFooterNote={company.invoiceFooterNote ?? ""}
      />
    </main>
  );
}
