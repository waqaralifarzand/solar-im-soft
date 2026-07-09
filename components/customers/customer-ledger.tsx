"use client";

import { formatMoney } from "@/lib/formatMoney";
import type { LedgerRow } from "@/lib/queries/customers";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Opening balance",
  INVOICE: "Invoice",
  PAYMENT: "Payment",
  RETURN: "Return",
  MANUAL_DEBIT: "Manual debit",
  MANUAL_CREDIT: "Manual credit",
};

interface CustomerLedgerProps {
  ledger: LedgerRow[];
  openingBalance: string;
  currency: string;
  lakhCroreFormat: boolean;
}

export function CustomerLedger({ ledger, openingBalance, currency, lakhCroreFormat }: CustomerLedgerProps) {
  const fmt = (v: string) => formatMoney(v, { currency, lakhCroreFormat });

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">Note</th>
            <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">Debit</th>
            <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">Credit</th>
            <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">Balance</th>
            <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">By</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-[44px] border-t border-border bg-surface/50">
            <td className="px-4 py-2 text-muted-foreground">—</td>
            <td className="px-4 py-2 font-medium">Opening balance</td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-right tabular-nums">{fmt(openingBalance)}</td>
            <td className="px-4 py-2 text-right tabular-nums">—</td>
            <td className="px-4 py-2 text-right font-medium tabular-nums">{fmt(openingBalance)}</td>
            <td className="px-4 py-2" />
          </tr>
          {ledger.map((entry) => {
            const debitVal = Number(entry.debit);
            const creditVal = Number(entry.credit);
            const balVal = Number(entry.runningBalance);
            return (
              <tr key={entry.id} className="h-[44px] border-t border-border hover:bg-surface">
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleDateString("en-PK", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2">{TYPE_LABELS[entry.type] ?? entry.type}</td>
                <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                  {entry.note ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {debitVal > 0 ? fmt(entry.debit) : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {creditVal > 0 ? fmt(entry.credit) : "—"}
                </td>
                <td className={`px-4 py-2 text-right font-medium tabular-nums ${balVal > 0 ? "text-destructive" : balVal < 0 ? "text-success" : ""}`}>
                  {fmt(entry.runningBalance)}
                </td>
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{entry.userName}</td>
              </tr>
            );
          })}
          {ledger.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No ledger entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
