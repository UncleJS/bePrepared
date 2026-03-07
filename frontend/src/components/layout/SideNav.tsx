"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  SlidersHorizontal,
  Building2,
} from "lucide-react";
import { clsx } from "clsx";
import { apiFetch } from "@/lib/api";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/modules", label: "Modules", icon: BookOpen },
  { href: "/tasks", label: "Ticksheets", icon: CheckSquare },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/equipment", label: "Equipment", icon: ShieldCheck },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/planning", label: "Planning", icon: Calculator },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

const settingsSubLinks = [
  { href: "/settings/household", label: "Household", icon: Home },
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/policies", label: "Policies", icon: SlidersHorizontal },
  { href: "/settings/modules", label: "Module Content", icon: BookOpen },
  { href: "/settings/inventory-categories", label: "Inventory Categories", icon: Package },
  { href: "/settings/equipment-categories", label: "Equipment Categories", icon: ShieldCheck },
  { href: "/settings/families", label: "Families", icon: Building2 },
];

export function SideNav() {
  const pathname = usePathname();
  const inSettings = pathname.startsWith("/settings");

  // Start expanded if already in settings
  const [settingsOpen, setSettingsOpen] = useState(inSettings);
  const [isAdmin, setIsAdmin] = useState(false);

  // Auto-expand when navigating into settings; collapse when leaving
  useEffect(() => {
    if (inSettings) setSettingsOpen(true);
  }, [inSettings]);

  // Fetch admin status once on mount
  useEffect(() => {
    apiFetch<{ isAdmin: boolean }>("/users/me")
      .then((me) => setIsAdmin(me.isAdmin === true))
      .catch(() => setIsAdmin(false));
  }, []);

  return (
    <nav className="w-56 shrink-0 border-r border-border bg-card flex flex-col py-4">
      {/* Main nav items */}
      {mainNavItems.map(({ href, label, icon: Icon }) => {
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

      {/* Settings toggle */}
      <button
        type="button"
        onClick={() => {
          setSettingsOpen((prev) => !prev);
        }}
        className={clsx(
          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors w-full text-left",
          inSettings
            ? "bg-primary/20 text-white border-r-2 border-primary"
            : "text-white hover:text-white hover:bg-accent"
        )}
      >
        <Settings size={16} />
        <span className="flex-1">Settings</span>
        {settingsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>

      {/* Settings sub-links — admin only */}
      {settingsOpen && isAdmin && (
        <div className="flex flex-col">
          {settingsSubLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-2 pl-9 pr-4 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:text-white hover:bg-accent"
                )}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
