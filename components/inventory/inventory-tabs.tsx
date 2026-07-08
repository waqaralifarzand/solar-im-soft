"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Products", href: "/inventory" },
  { label: "Categories", href: "/inventory/categories" },
  { label: "Adjustments", href: "/inventory/adjustments" },
];

export function InventoryTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
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
