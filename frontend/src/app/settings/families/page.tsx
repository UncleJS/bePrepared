import { auth } from "@/auth";
import { AdminAccessNotice } from "@/components/settings/AdminAccessNotice";
import { HouseholdManager } from "@/components/settings/HouseholdManager";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function FamiliesPage() {
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
        <h1 className="text-2xl font-bold">Families</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and manage household families.</p>
      </div>

      {isAdmin ? <HouseholdManager /> : <AdminAccessNotice section="Families" />}
    </div>
  );
}
