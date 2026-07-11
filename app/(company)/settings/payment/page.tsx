import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { PaymentDetailsForm } from "@/components/settings/payment-details-form";

export const dynamic = "force-dynamic";

export default async function PaymentDetailsSettingsPage() {
  const ctx = await getTenantContext();
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: {
      bankName: true,
      accountTitle: true,
      accountNumber: true,
      iban: true,
      jazzCashNumber: true,
      easyPaisaNumber: true,
    },
  });

  return (
    <PaymentDetailsForm
      initialBankName={company.bankName ?? ""}
      initialAccountTitle={company.accountTitle ?? ""}
      initialAccountNumber={company.accountNumber ?? ""}
      initialIban={company.iban ?? ""}
      initialJazzCashNumber={company.jazzCashNumber ?? ""}
      initialEasyPaisaNumber={company.easyPaisaNumber ?? ""}
    />
  );
}
