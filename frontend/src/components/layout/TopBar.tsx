import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { UserMenu } from "./UserMenu";

export async function TopBar() {
  const session = await auth();

  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      <ShieldCheck size={20} className="text-primary" />
      <span className="font-bold text-base tracking-tight">bePrepared</span>
      <span className="text-xs text-muted-foreground ml-auto mr-3">v0.1.0</span>
      {session?.user && <UserMenu name={session.user.name} />}
    </header>
  );
}
