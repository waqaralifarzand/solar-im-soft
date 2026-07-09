import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { formatMoney } from "@/lib/formatMoney";
import { StatusChip } from "@/components/ui/status-chip";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "destructive",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const [detail, company] = await Promise.all([
    getInvoiceDetail(ctx.companyId, params.id),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  if (!detail) notFound();
  // CASHIER can only view invoices they created themselves ("view own recent sales").
  if (ctx.role === "CASHIER" && detail.createdBy !== ctx.userId) notFound();

  const money = (v: string) => formatMoney(v, { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat });
  const remaining = Number(detail.total) - Number(detail.paidAmount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{detail.invoiceNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.type} · {new Date(detail.createdAt).toLocaleString()} · by {detail.createdByName}
          </p>
        </div>
        <StatusChip variant={STATUS_VARIANT[detail.status] ?? "neutral"}>{detail.status}</StatusChip>
      </div>

      <Card>
        <p className="text-sm text-muted-foreground">Customer</p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {detail.customer ? `${detail.customer.name}${detail.customer.phone ? ` — ${detail.customer.phone}` : ""}` : "Walk-in / cash sale"}
        </p>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Product</th>
                <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Qty</th>
                <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Unit price</th>
                <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Line total</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{item.nameSnapshot}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{item.qty}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{money(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right text-foreground">{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{money(detail.subtotal)}</span>
          </div>
          <div className="flex w-56 justify-between text-muted-foreground">
            <span>Discount</span>
            <span>-{money(detail.discount)}</span>
          </div>
          <div className="flex w-56 justify-between text-muted-foreground">
            <span>Tax</span>
            <span>{money(detail.taxAmount)}</span>
          </div>
          <div className="flex w-56 justify-between border-t border-border pt-1 font-semibold text-foreground">
            <span>Total</span>
            <span>{money(detail.total)}</span>
          </div>
          <div className="flex w-56 justify-between text-muted-foreground">
            <span>Paid</span>
            <span>{money(detail.paidAmount)}</span>
          </div>
          <div className="flex w-56 justify-between font-medium text-foreground">
            <span>Remaining</span>
            <span>{money(String(remaining))}</span>
          </div>
        </div>

        {detail.note && <p className="mt-4 text-sm text-muted-foreground">Note: {detail.note}</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Payments</p>
          {remaining > 0 && <RecordPaymentDialog invoiceId={detail.id} remaining={remaining.toFixed(2)} />}
        </div>
        {detail.payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {detail.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-t border-border py-2 text-sm first:border-0 first:pt-0">
                <div>
                  <span className="font-medium text-foreground">{money(p.amount)}</span>
                  <span className="ml-2 text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</span>
                  {p.note && <span className="ml-2 text-muted-foreground">— {p.note}</span>}
                </div>
                <div className="text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()} · {p.createdByName}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
