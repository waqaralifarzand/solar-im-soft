"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { CompanyUserRowActions } from "@/components/settings/company-user-row-actions";

export function CompanyUsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
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
          <CompanyUserRowActions
            userId={row.original.id}
            email={row.original.email}
            status={row.original.status}
            isSelf={row.original.id === currentUserId}
          />
        ),
      },
    ],
    [currentUserId],
  );

  return <DataTable columns={columns} data={users} emptyMessage="No users yet." />;
}
