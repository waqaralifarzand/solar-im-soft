import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTenantContext } from "@/lib/getTenantContext";
import { getCustomerDetail } from "@/lib/queries/customers";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/formatMoney";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerLedger } from "@/components/customers/customer-ledger";
import { ManualEntryDialog } from "@/components/customers/manual-entry-dialog";
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
  const { customer, ledger } = detail;

  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].runningBalance : "0";
  const fmtOpts = { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Back to customers
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{customer.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Balance: <span className={`font-medium ${Number(currentBalance) > 0 ? "text-destructive" : Number(currentBalance) < 0 ? "text-success" : ""}`}>
                {formatMoney(currentBalance, fmtOpts)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ManualEntryDialog customerId={customer.id} />
            <ReceivePaymentDialog customerId={customer.id} currentBalance={currentBalance} />
          </div>
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
          openingBalance={customer.openingBalance}
          currency={company.currency}
          lakhCroreFormat={company.lakhCroreFormat}
        />
      </div>
    </div>
  );
}
