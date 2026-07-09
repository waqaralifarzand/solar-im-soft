"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMoney } from "@/lib/formatMoney";
import type { LedgerRow } from "@/lib/queries/customers";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Opening",
  INVOICE: "Invoice",
  PAYMENT: "Payment",
  RETURN: "Return",
  MANUAL_DEBIT: "Manual debit",
  MANUAL_CREDIT: "Manual credit",
};

const TYPE_CHIP_VARIANT: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  OPENING: "neutral",
  INVOICE: "destructive",
  PAYMENT: "success",
  RETURN: "success",
  MANUAL_DEBIT: "warning",
  MANUAL_CREDIT: "success",
};

interface CustomerLedgerProps {
  ledger: LedgerRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function CustomerLedger({ ledger, currency, lakhCroreFormat }: CustomerLedgerProps) {
  const columns = useMemo<ColumnDef<LedgerRow>[]>(
    () => {
      const fmt = { currency, lakhCroreFormat };
      return [
      {
        header: "Date",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.createdAt.toLocaleString()}</span>
        ),
      },
      {
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => (
          <StatusChip variant={TYPE_CHIP_VARIANT[row.original.type] ?? "neutral"}>
            {TYPE_LABELS[row.original.type] ?? row.original.type}
          </StatusChip>
        ),
      },
      {
        header: "Debit",
        accessorKey: "debit",
        cell: ({ row }) => {
          const val = Number(row.original.debit);
          return val > 0 ? (
            <span className="text-destructive">{formatMoney(val, fmt)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        header: "Credit",
        accessorKey: "credit",
        cell: ({ row }) => {
          const val = Number(row.original.credit);
          return val > 0 ? (
            <span className="text-success">{formatMoney(val, fmt)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        header: "Balance",
        accessorKey: "runningBalance",
        cell: ({ row }) => {
          const val = Number(row.original.runningBalance);
          return (
            <span className={val > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
              {formatMoney(val, fmt)}
            </span>
          );
        },
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.note ?? "—"}</span>
        ),
      },
      { header: "By", accessorKey: "userName" },
    ];
    },
    [currency, lakhCroreFormat],
  );

  return <DataTable columns={columns} data={ledger} emptyMessage="No ledger entries yet." />;
}
