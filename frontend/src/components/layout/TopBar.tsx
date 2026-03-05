import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "./UserMenu";
import { HouseholdSwitcher } from "./HouseholdSwitcher";

export async function TopBar() {
  const session = await auth();

  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      <ShieldCheck size={20} className="text-primary" />
      <span className="font-bold text-base tracking-tight">bePrepared</span>
      <span className="text-xs text-muted-foreground ml-auto mr-3">v0.1.0</span>
      {session?.user ? (
        <>
          <HouseholdSwitcher
            sessionHouseholdId={(session.user as { householdId?: string }).householdId}
            isAdmin={(session.user as { isAdmin?: boolean }).isAdmin}
          />
          <UserMenu name={session.user.name} />
        </>
      ) : (
        <Link
          href="/login"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      )}
    </header>
  );
}
