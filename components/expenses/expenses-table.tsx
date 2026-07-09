"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/formatMoney";
import type { ExpenseRow } from "@/lib/queries/expenses";

interface ExpensesTableProps {
  expenses: ExpenseRow[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function ExpensesTable({ expenses, currency, lakhCroreFormat }: ExpensesTableProps) {
  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        header: "Date",
        accessorKey: "date",
        cell: ({ row }) => <span className="text-foreground">{new Date(row.original.date).toLocaleDateString()}</span>,
      },
      { header: "Category", accessorKey: "category" },
      {
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{formatMoney(row.original.amount, { currency, lakhCroreFormat })}</span>
        ),
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.note ?? "—"}</span>,
      },
      {
        header: "By",
        accessorKey: "createdByName",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdByName}</span>,
      },
    ],
    [currency, lakhCroreFormat],
  );

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="flex flex-col gap-3">
      <DataTable columns={columns} data={expenses} emptyMessage="No expenses recorded." />
      {expenses.length > 0 && (
        <p className="text-right text-sm font-medium text-foreground">
          Total: {formatMoney(total, { currency, lakhCroreFormat })}
        </p>
      )}
    </div>
  );
}
