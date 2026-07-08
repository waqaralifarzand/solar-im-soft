"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { CategoryRowActions } from "@/components/inventory/category-row-actions";

interface CategoryRow {
  id: string;
  name: string;
  productCount: number;
}

export function CategoriesTable({ categories }: { categories: CategoryRow[] }) {
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      { header: "Name", accessorKey: "name" },
      {
        header: "Products",
        accessorKey: "productCount",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.productCount}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <CategoryRowActions
            categoryId={row.original.id}
            name={row.original.name}
            productCount={row.original.productCount}
          />
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={categories} emptyMessage="No categories yet." />;
}
