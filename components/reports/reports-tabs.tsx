"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Sales", href: "/reports/sales" },
  { label: "Profit", href: "/reports/profit" },
  { label: "Stock valuation", href: "/reports/stock-valuation" },
  { label: "Customer dues", href: "/reports/customer-dues" },
  { label: "Top products", href: "/reports/top-products" },
];

export function ReportsTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={query ? `${tab.href}?${query}` : tab.href}
          className={cn(
            "rounded-pill px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-surface",
            pathname === tab.href && "bg-surface text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
