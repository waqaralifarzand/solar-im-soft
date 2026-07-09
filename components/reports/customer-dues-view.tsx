"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CustomerDuesReport, CustomerDueRow } from "@/lib/queries/reports";

interface CustomerDuesViewProps {
  report: CustomerDuesReport;
  currency: string;
  lakhCroreFormat: boolean;
}

export function CustomerDuesView({ report, currency, lakhCroreFormat }: CustomerDuesViewProps) {
  const fmt = useMemo(() => ({ currency, lakhCroreFormat }), [currency, lakhCroreFormat]);

  function handleExport() {
    downloadCsv(
      "customer-dues.csv",
      ["Customer", "Phone", "Balance"],
      report.rows.map((r) => [r.name, r.phone ?? "", r.balance]),
    );
  }

  const columns = useMemo<ColumnDef<CustomerDueRow>[]>(
    () => [
      {
        header: "Customer",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link href={`/customers/${row.original.customerId}`} className="font-medium text-foreground hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      { header: "Phone", accessorKey: "phone", cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone ?? "—"}</span> },
      {
        header: "Balance",
        accessorKey: "balance",
        cell: ({ row }) => <span className="font-medium text-destructive">{formatMoney(row.original.balance, fmt)}</span>,
      },
    ],
    [fmt],
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Customer dues</p>
          <p className="text-xs text-muted-foreground">Outstanding balances, sorted highest first. Not affected by the date range.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>
      <div className="mt-4">
        <DataTable columns={columns} data={report.rows} emptyMessage="No outstanding balances." />
      </div>
      <p className="mt-3 text-right text-sm font-semibold text-foreground">
        Total: {formatMoney(report.total, fmt)}
      </p>
    </Card>
  );
}
