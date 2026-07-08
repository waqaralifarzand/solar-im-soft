"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { UserRowActions } from "@/components/super/user-row-actions";

export function UsersTable({ companyId, users }: { companyId: string; users: User[] }) {
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      { header: "Name", accessorKey: "name" },
      { header: "Email", accessorKey: "email" },
      { header: "Role", accessorKey: "role" },
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
        header: "Last login",
        accessorKey: "lastLoginAt",
        cell: ({ row }) =>
          row.original.lastLoginAt ? (
            <span className="text-muted-foreground">{row.original.lastLoginAt.toLocaleDateString()}</span>
          ) : (
            <span className="text-muted-foreground">Never</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <UserRowActions companyId={companyId} userId={row.original.id} role={row.original.role} />
        ),
      },
    ],
    [companyId],
  );

  return <DataTable columns={columns} data={users} emptyMessage="No users yet." />;
}
