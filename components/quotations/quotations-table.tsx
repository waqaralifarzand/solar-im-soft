"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMoney } from "@/lib/formatMoney";
import type { QuotationRow } from "@/lib/queries/quotations";
import { QUOTE_STATUSES } from "@/lib/validations/quotations";

interface QuotationsTableProps {
  quotations: QuotationRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  DRAFT: "neutral",
  SENT: "warning",
  ACCEPTED: "success",
  CONVERTED: "success",
  EXPIRED: "destructive",
  REJECTED: "destructive",
};

export function QuotationsTable({ quotations, currency, lakhCroreFormat }: QuotationsTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations.filter((q) => {
      if (status && q.status !== status) return false;
      if (!term) return true;
      return (
        q.quoteNo.toLowerCase().includes(term) || (q.customerName && q.customerName.toLowerCase().includes(term))
      );
    });
  }, [quotations, search, status]);

  const columns = useMemo<ColumnDef<QuotationRow>[]>(
    () => [
      {
        header: "Quote #",
        accessorKey: "quoteNo",
        cell: ({ row }) => (
          <Link href={`/quotations/${row.original.id}`} className="font-medium text-foreground hover:underline">
            {row.original.quoteNo}
          </Link>
        ),
      },
      {
        header: "Customer",
        accessorKey: "customerName",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.customerName ?? "—"}</span>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <StatusChip variant={STATUS_VARIANT[row.original.status] ?? "neutral"}>{row.original.status}</StatusChip>
        ),
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
        header: "Valid until",
        accessorKey: "validUntil",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.validUntil ? new Date(row.original.validUntil).toLocaleDateString() : "—"}
          </span>
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
          placeholder="Search quote # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <DataTable columns={columns} data={filtered} emptyMessage="No quotations yet." />
    </div>
  );
}
