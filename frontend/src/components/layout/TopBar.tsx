"use client";

import { Menu, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { AlertBadge } from "./AlertBadge";
import { UserMenu } from "./UserMenu";
import { HouseholdSwitcher } from "./HouseholdSwitcher";

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { data: session } = useSession();
  const { householdId } = useActiveHouseholdId();
  const sessionUser = session?.user as
    | { householdId?: string; isAdmin?: boolean; name?: string | null }
    | undefined;
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
      {sessionUser ? (
        <HouseholdSwitcher
          sessionHouseholdId={sessionUser.householdId}
          isAdmin={sessionUser.isAdmin}
        />
      ) : null}
      {householdId ? <AlertBadge /> : null}
      <UserMenu name={sessionUser?.name} />
    </header>
  );
}
