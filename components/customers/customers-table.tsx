"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import type { CustomerRow } from "@/lib/queries/customers";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";

interface CustomersTableProps {
  customers: CustomerRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

type SortField = "name" | "balance";
type SortDir = "asc" | "desc";

export function CustomersTable({ customers, currency, lakhCroreFormat }: CustomersTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = customers;
    if (term) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.phone && c.phone.toLowerCase().includes(term)),
      );
    }

    result = [...result].sort((a, b) => {
      if (sortField === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const aVal = Number(a.balance);
      const bVal = Number(b.balance);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [customers, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "balance" ? "desc" : "asc");
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        header: () => (
          <button type="button" onClick={() => toggleSort("name")} className="font-medium">
            Name{sortIndicator("name")}
          </button>
        ),
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
        header: () => (
          <button type="button" onClick={() => toggleSort("balance")} className="font-medium">
            Balance (dues){sortIndicator("balance")}
          </button>
        ),
        accessorKey: "balance",
        cell: ({ row }) => {
          const val = Number(row.original.balance);
          return (
            <span className={`text-right font-medium tabular-nums ${val > 0 ? "text-destructive" : val < 0 ? "text-success" : "text-muted-foreground"}`}>
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
    [currency, lakhCroreFormat, sortField, sortDir],
  );

  function handleExport() {
    downloadCsv(
      "customers.csv",
      ["Name", "Phone", "Email", "Balance"],
      filtered.map((c) => [c.name, c.phone ?? "", c.email ?? "", c.balance]),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button type="button" variant="secondary" size="sm" className="ml-auto" onClick={handleExport}>
          <Download size={14} className="mr-1.5" />
          Export CSV
        </Button>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No customers yet." />
    </div>
  );
}
