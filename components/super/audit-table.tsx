"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { AuditLogRow } from "@/lib/queries/super-admin";

export function AuditTable({ logs }: { logs: AuditLogRow[] }) {
  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        header: "When",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.createdAt.toLocaleString()}</span>
        ),
      },
      {
        header: "Actor",
        accessorKey: "actorName",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.actorName}</p>
            <p className="text-xs text-muted-foreground">{row.original.actorEmail}</p>
          </div>
        ),
      },
      { header: "Action", accessorKey: "action" },
      { header: "Entity", accessorKey: "entity" },
      {
        header: "Company",
        accessorKey: "companyName",
        cell: ({ row }) => row.original.companyName ?? <span className="text-muted-foreground">—</span>,
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={logs} emptyMessage="No audit activity yet." />;
}
