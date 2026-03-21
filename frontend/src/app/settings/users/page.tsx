import { auth } from "@/auth";
import { UserManager } from "@/components/settings/UserManager";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminAccessNotice } from "@/components/settings/AdminAccessNotice";

export default async function UsersPage() {
  const session = await auth();
  const isAdmin = ((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin ?? false) === true;

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

      {isAdmin ? <UserManager /> : <AdminAccessNotice section="Users" />}
    </div>
  );
}
