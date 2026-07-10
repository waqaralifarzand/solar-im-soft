"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import type { CompanyAuditLogRow } from "@/lib/queries/audit";

export function AuditLogTable({ logs }: { logs: CompanyAuditLogRow[] }) {
  const [action, setAction] = useState("");

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const filtered = useMemo(() => (action ? logs.filter((l) => l.action === action) : logs), [logs, action]);

  const columns = useMemo<ColumnDef<CompanyAuditLogRow>[]>(
    () => [
      {
        header: "When",
        accessorKey: "createdAt",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdAt.toLocaleString()}</span>,
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
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-56">
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>
      <DataTable columns={columns} data={filtered} emptyMessage="No audit activity yet." />
    </div>
  );
}
