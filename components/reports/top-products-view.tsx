"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TopProductRow } from "@/lib/queries/reports";

interface TopProductsViewProps {
  rows: TopProductRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function TopProductsView({ rows, currency, lakhCroreFormat }: TopProductsViewProps) {
  const fmt = useMemo(() => ({ currency, lakhCroreFormat }), [currency, lakhCroreFormat]);
  const [sortBy, setSortBy] = useState<"revenue" | "qty">("revenue");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (sortBy === "revenue" ? Number(b.revenue) - Number(a.revenue) : b.qty - a.qty));
  }, [rows, sortBy]);

  function handleExport() {
    downloadCsv(
      "top-products.csv",
      ["SKU", "Product", "Qty sold", "Revenue"],
      sorted.map((r) => [r.sku, r.name, r.qty, r.revenue]),
    );
  }

  const columns = useMemo<ColumnDef<TopProductRow>[]>(
    () => [
      { header: "SKU", accessorKey: "sku", cell: ({ row }) => <span className="text-muted-foreground">{row.original.sku}</span> },
      { header: "Product", accessorKey: "name" },
      { header: "Qty sold", accessorKey: "qty", cell: ({ row }) => <span className="text-right">{row.original.qty}</span> },
      {
        header: "Revenue",
        accessorKey: "revenue",
        cell: ({ row }) => <span className="font-medium text-foreground">{formatMoney(row.original.revenue, fmt)}</span>,
      },
    ],
    [fmt],
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Top products</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-pill border border-border p-0.5">
            <button
              type="button"
              onClick={() => setSortBy("revenue")}
              className={cn("rounded-pill px-3 py-1 text-xs font-medium", sortBy === "revenue" ? "bg-surface text-foreground" : "text-muted-foreground")}
            >
              By revenue
            </button>
            <button
              type="button"
              onClick={() => setSortBy("qty")}
              className={cn("rounded-pill px-3 py-1 text-xs font-medium", sortBy === "qty" ? "bg-surface text-foreground" : "text-muted-foreground")}
            >
              By quantity
            </button>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <DataTable columns={columns} data={sorted} emptyMessage="No sales in this range." />
      </div>
    </Card>
  );
}
