import { Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { AlertBadge } from "./AlertBadge";
import { UserMenu } from "./UserMenu";
import { HouseholdSwitcher } from "./HouseholdSwitcher";

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { state } = useAuth();
  const { householdId } = useActiveHouseholdId();
  const user = state.status === "authenticated" ? state.user : undefined;

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 shrink-0">
      <button
        type="button"
        onClick={onOpenNav}
        className="inline-flex rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={16} />
      </button>
      <ShieldCheck size={20} className="text-primary" />
      <span className="font-bold text-base tracking-tight">bePrepared</span>
      <span className="ml-auto mr-1 hidden text-xs text-muted-foreground sm:inline">v0.1.0</span>
      {user ? (
        <HouseholdSwitcher sessionHouseholdId={user.householdId} isAdmin={user.isAdmin} />
      ) : null}
      {householdId ? <AlertBadge /> : null}
      <UserMenu name={user?.username} />
    </header>
  );
}
