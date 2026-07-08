"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import type { ProductRow } from "@/lib/queries/inventory";
import { ProductRowActions } from "@/components/inventory/product-row-actions";

interface ProductsTableProps {
  products: ProductRow[];
  categories: { id: string; name: string }[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function ProductsTable({ products, categories, currency, lakhCroreFormat }: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term) && !p.sku.toLowerCase().includes(term)) return false;
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (lowStockOnly && !p.lowStock) return false;
      return true;
    });
  }, [products, search, categoryId, lowStockOnly]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      { header: "SKU", accessorKey: "sku" },
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link href={`/inventory/${row.original.id}`} className="font-medium text-foreground hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        header: "Category",
        accessorKey: "categoryName",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.categoryName ?? "—"}</span>
        ),
      },
      { header: "Unit", accessorKey: "unit" },
      {
        header: "Cost price",
        accessorKey: "costPrice",
        cell: ({ row }) => formatMoney(row.original.costPrice, { currency, lakhCroreFormat }),
      },
      {
        header: "Sale price",
        accessorKey: "salePrice",
        cell: ({ row }) => formatMoney(row.original.salePrice, { currency, lakhCroreFormat }),
      },
      {
        header: "Stock",
        accessorKey: "stockQty",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.stockQty}</span>
            {row.original.lowStock && <StatusChip variant="warning">Low stock</StatusChip>}
          </div>
        ),
      },
      { header: "Reorder at", accessorKey: "reorderLevel" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <ProductRowActions productId={row.original.id} name={row.original.name} />,
      },
    ],
    [currency, lakhCroreFormat],
  );

  function handleExport() {
    downloadCsv(
      "products.csv",
      ["SKU", "Name", "Category", "Unit", "Cost price", "Sale price", "Stock", "Reorder at", "Low stock"],
      filtered.map((p) => [
        p.sku,
        p.name,
        p.categoryName ?? "",
        p.unit,
        p.costPrice,
        p.salePrice,
        p.stockQty,
        p.reorderLevel,
        p.lowStock ? "Yes" : "No",
      ]),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="max-w-[200px]">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Low stock only
        </label>
        <Button type="button" variant="secondary" size="sm" className="ml-auto" onClick={handleExport}>
          <Download size={14} className="mr-1.5" />
          Export CSV
        </Button>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No products match your filters." />
    </div>
  );
}
