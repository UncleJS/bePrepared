"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Package,
  Wrench,
  Bell,
  Settings,
  Calculator,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";

const publicNavItems = [
  { href: "/dashboard",   label: "Dashboard",    icon: LayoutDashboard },
  { href: "/modules",     label: "Modules",      icon: BookOpen },
  { href: "/tasks",       label: "Ticksheets",   icon: CheckSquare },
  { href: "/inventory",   label: "Inventory",    icon: Package },
  { href: "/equipment",   label: "Equipment",    icon: ShieldCheck },
  { href: "/maintenance", label: "Maintenance",  icon: Wrench },
  { href: "/planning",    label: "Planning",     icon: Calculator },
  { href: "/alerts",      label: "Alerts",       icon: Bell },
  { href: "/settings",    label: "Settings",     icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  const navItems = publicNavItems;

  return (
    <nav className="w-56 shrink-0 border-r border-border bg-card flex flex-col py-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/20 text-white border-r-2 border-primary"
                : "text-white hover:text-white hover:bg-accent"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
