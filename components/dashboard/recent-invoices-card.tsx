import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMoney } from "@/lib/formatMoney";
import type { RecentInvoiceRow } from "@/lib/queries/dashboard";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "destructive",
};

interface RecentInvoicesCardProps {
  invoices: RecentInvoiceRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function RecentInvoicesCard({ invoices, currency, lakhCroreFormat }: RecentInvoicesCardProps) {
  const fmt = { currency, lakhCroreFormat };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Recent invoices</p>
        <Link href="/invoices" className="text-xs font-medium text-accent hover:underline">
          View all
        </Link>
      </div>
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-card bg-surface">
            <span className="text-lg">🧾</span>
          </div>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-0 hover:bg-surface"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{inv.invoiceNo}</p>
                <p className="truncate text-xs text-muted-foreground">{inv.customerName ?? "Walk-in"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-medium text-foreground">{formatMoney(inv.total, fmt)}</span>
                <StatusChip variant={STATUS_VARIANT[inv.status] ?? "neutral"}>{inv.status}</StatusChip>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
