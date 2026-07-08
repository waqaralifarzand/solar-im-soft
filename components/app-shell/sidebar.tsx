"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItemsForRole } from "@/lib/nav-items";
import type { Role } from "@prisma/client";

interface SidebarProps {
  role: Role;
  companyName: string;
  logoUrl: string | null;
  userName: string;
  userRole: string;
}

export function Sidebar({ role, companyName, logoUrl, userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavItemsForRole(role);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col justify-between border-r border-border bg-surface transition-[width]",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div>
        <div className="flex h-16 items-center gap-2 px-4">
          {logoUrl ? (
            <Image src={logoUrl} alt={companyName} width={28} height={28} className="rounded-md" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-white">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <span className="truncate text-[13px] font-medium text-foreground">{companyName}</span>
          )}
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-pill px-3 py-2 text-[13px] font-medium text-foreground hover:bg-white",
                  active && "bg-white",
                )}
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <Icon size={16} />
                  {active && (
                    <span className="absolute -left-2 h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        {!collapsed && (
          <div className="px-1">
            <p className="truncate text-[13px] font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userRole}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center rounded-pill p-2 text-muted-foreground hover:bg-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
