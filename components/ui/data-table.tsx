"use client";

import { useEffect, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyMessage?: string;
}

/**
 * Below this width a multi-column table doesn't fit, so rows render as stacked cards
 * instead — matches Tailwind's `md` breakpoint used elsewhere in the design system.
 */
const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

function useIsMobile(): boolean {
  // Starts false (desktop table) so server and first client render match — real browsers
  // never SSR, and hydration always happens before this effect can flip it, so there's no
  // mismatch. Only *after* mount do we read the actual viewport and switch if needed.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function DataTable<TData>({ columns, data, emptyMessage = "Nothing here yet" }: DataTableProps<TData>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const headerGroup = table.getHeaderGroups()[0];
  const rows = table.getRowModel().rows;
  const isMobile = useIsMobile();

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    // A table with several columns doesn't fit a phone width, so each row becomes its own
    // card: first column as the title, the rest as label/value lines. Columns with no
    // header text (typically a trailing actions column) are shown without a label.
    return (
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const cells = row.getVisibleCells();
          const [titleCell, ...restCells] = cells;
          return (
            <div key={row.id} className="rounded-card border border-border bg-card p-4">
              <div className="text-sm font-medium text-foreground">
                {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {restCells.map((cell, i) => {
                  const header = headerGroup.headers[i + 1];
                  const label = header?.isPlaceholder
                    ? null
                    : flexRender(header?.column.columnDef.header, header?.getContext());
                  const hasLabel = typeof label === "string" && label.length > 0;
                  return (
                    <div key={cell.id} className={hasLabel ? "flex items-center justify-between gap-3 text-sm" : "text-sm"}>
                      {hasLabel && <span className="text-xs text-muted-foreground">{label}</span>}
                      <span className="text-foreground">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="h-[44px] border-t border-border hover:bg-surface">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
