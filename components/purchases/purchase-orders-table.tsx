"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMoney } from "@/lib/formatMoney";
import type { PurchaseOrderRow } from "@/lib/queries/purchases";
import { PO_STATUSES } from "@/lib/validations/purchases";

interface PurchaseOrdersTableProps {
  purchaseOrders: PurchaseOrderRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  DRAFT: "neutral",
  ORDERED: "warning",
  RECEIVED: "success",
};

export function PurchaseOrdersTable({ purchaseOrders, currency, lakhCroreFormat }: PurchaseOrdersTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      if (status && po.status !== status) return false;
      if (!term) return true;
      return po.poNo.toLowerCase().includes(term) || po.supplierName.toLowerCase().includes(term);
    });
  }, [purchaseOrders, search, status]);

  const columns = useMemo<ColumnDef<PurchaseOrderRow>[]>(
    () => [
      {
        header: "PO #",
        accessorKey: "poNo",
        cell: ({ row }) => (
          <Link href={`/purchases/${row.original.id}`} className="font-medium text-foreground hover:underline">
            {row.original.poNo}
          </Link>
        ),
      },
      {
        header: "Supplier",
        accessorKey: "supplierName",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.supplierName}</span>,
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
        header: "Received",
        accessorKey: "receivedAt",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.receivedAt ? new Date(row.original.receivedAt).toLocaleDateString() : "—"}
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
          placeholder="Search PO # or supplier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <DataTable columns={columns} data={filtered} emptyMessage="No purchase orders yet." />
    </div>
  );
}
