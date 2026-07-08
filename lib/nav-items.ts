import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  ClipboardList,
  Receipt,
  FileText,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Purchases", href: "/purchases", icon: ClipboardList },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const NAV_BY_ROLE: Record<Exclude<Role, "SUPER_ADMIN">, string[]> = {
  ADMIN: [
    "Dashboard",
    "POS",
    "Inventory",
    "Customers",
    "Suppliers",
    "Purchases",
    "Invoices",
    "Quotations",
    "Expenses",
    "Reports",
    "Settings",
  ],
  MANAGER: [
    "Dashboard",
    "POS",
    "Inventory",
    "Customers",
    "Suppliers",
    "Purchases",
    "Invoices",
    "Quotations",
    "Expenses",
    "Reports",
  ],
  CASHIER: ["POS"],
};

export function getNavItemsForRole(role: Role): NavItem[] {
  if (role === "SUPER_ADMIN") return [];
  const labels = NAV_BY_ROLE[role];
  return ALL_NAV_ITEMS.filter((item) => labels.includes(item.label));
}
