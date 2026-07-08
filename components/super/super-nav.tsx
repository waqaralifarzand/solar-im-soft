"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";

const NAV_ITEMS = [
  { label: "Overview", href: "/super" },
  { label: "Companies", href: "/super/companies" },
  { label: "Audit Log", href: "/super/audit" },
];

export function SuperNav() {
  const pathname = usePathname();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
      <div className="flex items-center gap-6">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">Solar IMS</span>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/super" ? pathname === "/super" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-surface",
                  active && "bg-surface text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ChangePasswordDialog
          trigger={
            <Button variant="secondary" size="sm">
              Change password
            </Button>
          }
        />
        <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
