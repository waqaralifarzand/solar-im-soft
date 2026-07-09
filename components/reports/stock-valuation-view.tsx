"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StockValuationReport, StockValuationRow } from "@/lib/queries/reports";

interface StockValuationViewProps {
  report: StockValuationReport;
  currency: string;
  lakhCroreFormat: boolean;
}

export function StockValuationView({ report, currency, lakhCroreFormat }: StockValuationViewProps) {
  const fmt = useMemo(() => ({ currency, lakhCroreFormat }), [currency, lakhCroreFormat]);

  function handleExport() {
    downloadCsv(
      "stock-valuation.csv",
      ["SKU", "Product", "Qty", "Cost price", "Value"],
      report.rows.map((r) => [r.sku, r.name, r.qty, r.costPrice, r.value]),
    );
  }

  const columns = useMemo<ColumnDef<StockValuationRow>[]>(
    () => [
      { header: "SKU", accessorKey: "sku", cell: ({ row }) => <span className="text-muted-foreground">{row.original.sku}</span> },
      { header: "Product", accessorKey: "name" },
      { header: "Qty", accessorKey: "qty", cell: ({ row }) => <span className="text-right">{row.original.qty}</span> },
      {
        header: "Cost price",
        accessorKey: "costPrice",
        cell: ({ row }) => <span className="text-muted-foreground">{formatMoney(row.original.costPrice, fmt)}</span>,
      },
      {
        header: "Value",
        accessorKey: "value",
        cell: ({ row }) => <span className="font-medium text-foreground">{formatMoney(row.original.value, fmt)}</span>,
      },
    ],
    [fmt],
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Stock valuation</p>
          <p className="text-xs text-muted-foreground">Current quantity × current cost price. Not affected by the date range.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>
      <div className="mt-4">
        <DataTable columns={columns} data={report.rows} emptyMessage="No products in stock." />
      </div>
      <p className="mt-3 text-right text-sm font-semibold text-foreground">
        Total: {formatMoney(report.total, fmt)}
      </p>
    </Card>
  );
}
