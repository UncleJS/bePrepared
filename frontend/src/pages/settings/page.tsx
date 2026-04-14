import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Home, Users, BookOpen, Package, ShieldCheck, SlidersHorizontal } from "lucide-react";

const settingsSections = [
  {
    to: "/settings/household",
    icon: Home,
    label: "Household",
    description: "Edit your household name, size, and notes.",
  },
  {
    to: "/settings/users",
    icon: Users,
    label: "Users",
    description: "Manage user accounts and personal profiles.",
    adminOnly: true,
  },
  {
    to: "/settings/policies",
    icon: SlidersHorizontal,
    label: "Policies",
    description: "Household overrides and scenario planning values.",
  },
  {
    to: "/settings/modules",
    icon: BookOpen,
    label: "Module Content",
    description: "Categories, modules, sections, and guidance docs.",
    adminOnly: true,
  },
  {
    to: "/settings/inventory-categories",
    icon: Package,
    label: "Inventory Categories",
    description: "System and custom inventory categories.",
    adminOnly: true,
  },
  {
    to: "/settings/equipment-categories",
    icon: ShieldCheck,
    label: "Equipment Categories",
    description: "System and custom equipment categories.",
    adminOnly: true,
  },
];

export default function SettingsPage() {
  const { state } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.isAdmin;
  const visibleSections = settingsSections.filter((section) => !section.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your household, users, content, and policies.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleSections.map(({ to, icon: Icon, label, description }) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent transition-colors p-4 flex items-start gap-3"
          >
            <Icon size={18} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
