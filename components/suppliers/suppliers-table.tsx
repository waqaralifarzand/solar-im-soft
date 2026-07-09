"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import type { SupplierRow } from "@/lib/queries/customers";
import { SupplierRowActions } from "@/components/suppliers/supplier-row-actions";

interface SuppliersTableProps {
  suppliers: SupplierRow[];
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.phone && s.phone.toLowerCase().includes(term)),
    );
  }, [suppliers, search]);

  const columns = useMemo<ColumnDef<SupplierRow>[]>(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link href={`/suppliers/${row.original.id}`} className="font-medium text-foreground hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.phone ?? "—"}</span>
        ),
      },
      {
        header: "Address",
        accessorKey: "address",
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-[300px] truncate block">{row.original.address ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <SupplierRowActions supplierId={row.original.id} name={row.original.name} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No suppliers yet." />
    </div>
  );
}
