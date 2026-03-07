"use client";

import { UserManager } from "@/components/settings/UserManager";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user accounts and personal profiles.
        </p>
      </div>

      <UserManager />
    </div>
  );
}
