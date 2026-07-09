import { notFound } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { getQuotationDetail } from "@/lib/queries/quotations";
import { generateQuotationShareLink } from "@/lib/actions/quotation-share";
import { formatMoney } from "@/lib/formatMoney";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuotationStatusSelect } from "@/components/quotations/quotation-status-select";
import { ConvertToInvoiceButton } from "@/components/quotations/convert-to-invoice-button";
import { ShareWhatsAppButton } from "@/components/invoices/share-whatsapp-button";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  DRAFT: "neutral",
  SENT: "warning",
  ACCEPTED: "success",
  CONVERTED: "success",
  EXPIRED: "destructive",
  REJECTED: "destructive",
};

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [detail, company] = await Promise.all([
    getQuotationDetail(ctx.companyId, params.id),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  if (!detail) notFound();

  const money = (v: string) => formatMoney(v, { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat });
  const customerLabel = detail.customer
    ? `${detail.customer.name}${detail.customer.phone ? ` — ${detail.customer.phone}` : ""}`
    : (detail.customerNameFree ?? "—");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{detail.quoteNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(detail.createdAt).toLocaleString()} · by {detail.createdByName}
            {detail.validUntil && <> · valid until {new Date(detail.validUntil).toLocaleDateString()}</>}
          </p>
          {detail.convertedInvoiceNo && (
            <p className="mt-1 text-sm">
              Converted to{" "}
              <Link href={`/invoices/${detail.convertedInvoiceId}`} className="font-medium text-accent hover:underline">
                {detail.convertedInvoiceNo}
              </Link>
            </p>
          )}
        </div>
        <StatusChip variant={STATUS_VARIANT[detail.status] ?? "neutral"}>{detail.status}</StatusChip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a href={`/api/quotations/${detail.id}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary" size="sm">
            <Download size={14} className="mr-1.5" />
            Download PDF
          </Button>
        </a>
        <ShareWhatsAppButton shareAction={generateQuotationShareLink.bind(null, detail.id)} />
        {detail.status !== "CONVERTED" && <QuotationStatusSelect quotationId={detail.id} status={detail.status} />}
        {detail.status !== "CONVERTED" && detail.customer && <ConvertToInvoiceButton quotationId={detail.id} />}
      </div>

      <Card>
        <p className="text-sm text-muted-foreground">Customer</p>
        <p className="mt-1 text-sm font-medium text-foreground">{customerLabel}</p>
        {!detail.customer && detail.status !== "CONVERTED" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Attach a saved customer to convert this quote to an invoice.
          </p>
        )}
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
        </div>

        {detail.note && <p className="mt-4 text-sm text-muted-foreground">Note: {detail.note}</p>}
      </Card>
    </div>
  );
}
