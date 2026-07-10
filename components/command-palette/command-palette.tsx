"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import type { Role } from "@prisma/client";
import { globalSearch, type GlobalSearchResults } from "@/lib/actions/search";
import { getNavItemsForRole } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: string;
}

const EMPTY_RESULTS: GlobalSearchResults = { products: [], customers: [], invoices: [] };

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navItems = useMemo(() => getNavItemsForRole(role), [role]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      globalSearch(term).then((data) => {
        if (!cancelled) setResults(data);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const items = useMemo<PaletteItem[]>(() => {
    const term = query.trim().toLowerCase();
    const navMatches: PaletteItem[] = navItems
      .filter((n) => !term || n.label.toLowerCase().includes(term))
      .map((n) => ({ id: `nav-${n.href}`, label: n.label, href: n.href, group: "Navigate" }));

    const productItems: PaletteItem[] = results.products.map((p) => ({
      id: `product-${p.id}`,
      label: p.name,
      sublabel: p.sku,
      href: `/inventory/${p.id}`,
      group: "Products",
    }));
    const customerItems: PaletteItem[] = results.customers.map((c) => ({
      id: `customer-${c.id}`,
      label: c.name,
      sublabel: c.phone ?? undefined,
      href: `/customers/${c.id}`,
      group: "Customers",
    }));
    const invoiceItems: PaletteItem[] = results.invoices.map((i) => ({
      id: `invoice-${i.id}`,
      label: i.invoiceNo,
      sublabel: i.customerName ?? "Walk-in",
      href: `/invoices/${i.id}`,
      group: "Invoices",
    }));

    return [...navMatches, ...productItems, ...customerItems, ...invoiceItems];
  }, [navItems, results, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  function select(item: PaletteItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) select(item);
    }
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return groups;
  }, [items]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-pill border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground"
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span>Search…</span>
          <kbd className="rounded-sm bg-surface px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-card border border-border bg-card shadow-lg focus:outline-none"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search products, customers, invoices, or jump to a page.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search products, customers, invoices, or jump to a page…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {query.trim().length >= 2 ? "No matches." : "Type to search, or pick a page below."}
              </p>
            ) : (
              [...grouped.entries()].map(([group, groupItems]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const globalIndex = items.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => select(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-pill px-3 py-2 text-left text-sm text-foreground",
                          globalIndex === selectedIndex ? "bg-surface" : "hover:bg-surface",
                        )}
                      >
                        <span>{item.label}</span>
                        {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
