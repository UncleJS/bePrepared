"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

interface UserMenuProps {
  name?: string | null;
}

export function UserMenu({ name }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <User size={14} />
        <span className="hidden sm:inline">{name ?? "user"}</span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Sign out"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
