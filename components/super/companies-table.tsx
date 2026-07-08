"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { CompanyRowActions } from "@/components/super/company-row-actions";
import type { CompanyListRow } from "@/lib/queries/super-admin";

export function CompaniesTable({ companies }: { companies: CompanyListRow[] }) {
  const columns = useMemo<ColumnDef<CompanyListRow>[]>(
    () => [
      {
        header: "Company",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link
            href={`/super/companies/${row.original.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <StatusChip variant={row.original.status === "ACTIVE" ? "success" : "neutral"}>
            {row.original.status}
          </StatusChip>
        ),
      },
      {
        header: () => <div className="text-right">Users</div>,
        accessorKey: "usersCount",
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.usersCount}</div>,
      },
      {
        header: () => <div className="text-right">Invoices</div>,
        accessorKey: "invoicesCount",
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.invoicesCount}</div>,
      },
      {
        header: "Last activity",
        accessorKey: "lastActivity",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.lastActivity.toLocaleDateString()}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <CompanyRowActions company={row.original} />,
      },
    ],
    [],
  );

  return (
    <DataTable columns={columns} data={companies} emptyMessage="No companies yet. Create the first one." />
  );
}
