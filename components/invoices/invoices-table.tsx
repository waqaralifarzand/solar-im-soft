"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMoney } from "@/lib/formatMoney";
import type { InvoiceRow } from "@/lib/queries/invoices";
import { INVOICE_STATUSES } from "@/lib/validations/invoices";

interface InvoicesTableProps {
  invoices: InvoiceRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "destructive",
};

export function InvoicesTable({ invoices, currency, lakhCroreFormat }: InvoicesTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (status && inv.status !== status) return false;
      if (!term) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(term) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(term))
      );
    });
  }, [invoices, search, status]);

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        header: "Invoice #",
        accessorKey: "invoiceNo",
        cell: ({ row }) => (
          <Link href={`/invoices/${row.original.id}`} className="font-medium text-foreground hover:underline">
            {row.original.invoiceNo}
          </Link>
        ),
      },
      {
        header: "Customer",
        accessorKey: "customerName",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.customerName ?? "Walk-in"}</span>
        ),
      },
      { header: "Type", accessorKey: "type", cell: ({ row }) => <span className="text-muted-foreground">{row.original.type}</span> },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusChip variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</StatusChip>,
      },
      {
        header: "Total",
        accessorKey: "total",
        cell: ({ row }) => (
          <span className="text-right font-medium text-foreground">
            {formatMoney(row.original.total, { currency, lakhCroreFormat })}
          </span>
        ),
      },
      {
        header: "Paid",
        accessorKey: "paidAmount",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatMoney(row.original.paidAmount, { currency, lakhCroreFormat })}</span>
        ),
      },
      {
        header: "Date",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>
        ),
      },
      {
        header: "By",
        accessorKey: "createdByName",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdByName}</span>,
      },
    ],
    [currency, lakhCroreFormat],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search invoice # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <DataTable columns={columns} data={filtered} emptyMessage="No invoices yet." />
    </div>
  );
}
