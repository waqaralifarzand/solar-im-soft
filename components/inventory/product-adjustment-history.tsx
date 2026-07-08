"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import type { StockAdjustment } from "@prisma/client";

interface HistoryRow extends StockAdjustment {
  userName: string;
}

export function ProductAdjustmentHistory({ adjustments }: { adjustments: HistoryRow[] }) {
  const columns = useMemo<ColumnDef<HistoryRow>[]>(
    () => [
      {
        header: "Date",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.createdAt.toLocaleString()}</span>
        ),
      },
      {
        header: "Qty change",
        accessorKey: "qtyChange",
        cell: ({ row }) => (
          <span className={row.original.qtyChange < 0 ? "text-destructive" : "text-success"}>
            {row.original.qtyChange > 0 ? `+${row.original.qtyChange}` : row.original.qtyChange}
          </span>
        ),
      },
      {
        header: "Reason",
        accessorKey: "reason",
        cell: ({ row }) => <StatusChip variant="neutral">{row.original.reason}</StatusChip>,
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.note ?? "—"}</span>,
      },
      { header: "By", accessorKey: "userName" },
    ],
    [],
  );

  return <DataTable columns={columns} data={adjustments} emptyMessage="No stock adjustments yet." />;
}
