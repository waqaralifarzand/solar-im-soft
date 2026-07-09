import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getCustomerDetail } from "@/lib/queries/customers";
import { formatMoney } from "@/lib/formatMoney";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerLedger } from "@/components/customers/customer-ledger";
import { ManualLedgerEntryDialog } from "@/components/customers/manual-ledger-entry-dialog";
import { ReceivePaymentDialog } from "@/components/customers/receive-payment-dialog";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const [detail, company] = await Promise.all([
    getCustomerDetail(ctx.companyId, params.id),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  if (!detail) notFound();
  const { customer, ledger, balance } = detail;
  const fmt = { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat };
  const formattedBalance = formatMoney(balance, fmt);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Balance: {formattedBalance}
          </p>
        </div>
        <div className="flex gap-2">
          <ManualLedgerEntryDialog customerId={customer.id} />
          <ReceivePaymentDialog customerId={customer.id} currentBalance={formattedBalance} />
        </div>
      </div>

      <CustomerForm
        mode="edit"
        customerId={customer.id}
        initialValues={{
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
        }}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-foreground">Khata ledger</h2>
        <CustomerLedger
          ledger={ledger}
          currency={company.currency}
          lakhCroreFormat={company.lakhCroreFormat}
        />
      </div>
    </div>
  );
}
