"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/formatMoney";
import type { CustomerRow } from "@/lib/queries/customers";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";

interface CustomersTableProps {
  customers: CustomerRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function CustomersTable({ customers, currency, lakhCroreFormat }: CustomersTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)),
    );
  }, [customers, search]);

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link href={`/customers/${row.original.id}`} className="font-medium text-foreground hover:underline">
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
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
        ),
      },
      {
        header: "Balance (dues)",
        accessorKey: "balance",
        sortingFn: (a, b) => Number(a.original.balance) - Number(b.original.balance),
        cell: ({ row }) => {
          const val = Number(row.original.balance);
          return (
            <span className={val > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
              {formatMoney(row.original.balance, { currency, lakhCroreFormat })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <CustomerRowActions customerId={row.original.id} name={row.original.name} />,
      },
    ],
    [currency, lakhCroreFormat],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <DataTable columns={columns} data={filtered} emptyMessage="No customers yet." />
    </div>
  );
}
