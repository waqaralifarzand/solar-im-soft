"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Branding", href: "/settings/branding" },
  { label: "Tax & currency", href: "/settings/tax" },
  { label: "Users", href: "/settings/users" },
  { label: "Data", href: "/settings/data" },
  { label: "Audit log", href: "/settings/audit" },
];

export function SettingsTabs() {
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
