import { notFound } from "next/navigation";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { getPurchaseOrderDetail } from "@/lib/queries/purchases";
import { formatMoney } from "@/lib/formatMoney";
import { StatusChip } from "@/components/ui/status-chip";
import { Card } from "@/components/ui/card";
import { PurchaseOrderStatusSelect } from "@/components/purchases/purchase-order-status-select";
import { ReceivePurchaseOrderDialog } from "@/components/purchases/receive-purchase-order-dialog";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  DRAFT: "neutral",
  ORDERED: "warning",
  RECEIVED: "success",
};

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [detail, company] = await Promise.all([
    getPurchaseOrderDetail(ctx.companyId, params.id),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  if (!detail) notFound();

  const money = (v: string) => formatMoney(v, { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{detail.poNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(detail.createdAt).toLocaleString()} · by {detail.createdByName}
            {detail.receivedAt && <> · received {new Date(detail.receivedAt).toLocaleString()}</>}
          </p>
        </div>
        <StatusChip variant={STATUS_VARIANT[detail.status] ?? "neutral"}>{detail.status}</StatusChip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {detail.status !== "RECEIVED" && <PurchaseOrderStatusSelect poId={detail.id} status={detail.status} />}
        {detail.status !== "RECEIVED" && (
          <ReceivePurchaseOrderDialog po={detail} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />
        )}
      </div>

      <Card>
        <p className="text-sm text-muted-foreground">Supplier</p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {detail.supplier.name}
          {detail.supplier.phone ? ` — ${detail.supplier.phone}` : ""}
        </p>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left text-[13px] font-medium text-muted-foreground">Product</th>
                <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Qty</th>
                <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Unit cost</th>
                <th className="px-3 py-2 text-right text-[13px] font-medium text-muted-foreground">Line total</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">
                    {item.productName}
                    <span className="ml-2 text-xs text-muted-foreground">{item.productSku}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{item.qty}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{money(item.unitCost)}</td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {money(String(Number(item.qty) * Number(item.unitCost)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between border-t border-border pt-1 font-semibold text-foreground">
            <span>Total</span>
            <span>{money(detail.total)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
