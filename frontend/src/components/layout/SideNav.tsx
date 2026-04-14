import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Package,
  Wrench,
  Bell,
  Settings,
  Calculator,
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { clsx } from "clsx";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/modules", label: "Modules", icon: BookOpen },
  { href: "/tasks", label: "Ticksheets", icon: CheckSquare },
  { href: "/supplies", label: "Supplies & Equipment", icon: Package },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/planning", label: "Planning", icon: Calculator },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

const settingsSubLinks = [
  { href: "/settings", label: "Overview", icon: Settings, exact: true },
  { href: "/settings/household", label: "Household", icon: Home },
  { href: "/settings/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings/policies", label: "Policies", icon: SlidersHorizontal },
  { href: "/settings/modules", label: "Module Content", icon: BookOpen, adminOnly: true },
  {
    href: "/settings/inventory-categories",
    label: "Inventory Categories",
    icon: Package,
    adminOnly: true,
  },
  {
    href: "/settings/equipment-categories",
    label: "Equipment Categories",
    icon: Package,
    adminOnly: true,
  },
];

export function SideNav({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { state } = useAuth();
  const inSettings = pathname.startsWith("/settings");

  const [settingsOpen, setSettingsOpen] = useState(inSettings);
  const isAdmin = useMemo(
    () => (state.status === "authenticated" ? state.user.isAdmin === true : false),
    [state]
  );

  useEffect(() => {
    if (inSettings) setSettingsOpen(true);
  }, [inSettings]);

  const visibleSettingsSubLinks = settingsSubLinks.filter(
    (item) => !("adminOnly" in item && item.adminOnly && !isAdmin)
  );

  return (
    <nav className={clsx("flex shrink-0 flex-col border-r border-border bg-card py-4", className)}>
      {mainNavItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            to={href}
            onClick={onNavigate}
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
        onClick={() => setSettingsOpen((prev) => !prev)}
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

      {settingsOpen && (
        <div className="flex flex-col">
          {visibleSettingsSubLinks.map(({ href, label, icon: Icon, ...item }) => {
            const active =
              pathname === href ||
              (!("exact" in item && item.exact) && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                to={href}
                onClick={onNavigate}
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
