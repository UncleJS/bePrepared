import { apiFetch, getSessionHouseholdId } from "@/lib/api";
import { HouseholdSettingsEditor } from "@/components/settings/HouseholdSettingsEditor";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Household = {
  id: string;
  name: string;
  targetPeople: number;
  notes?: string | null;
};

export default async function HouseholdPage() {
  const householdId = await getSessionHouseholdId();
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  let household: Household | null = null;
  try {
    household = await apiFetch<Household>(`/households/${householdId}`);
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-2xl font-bold">Household</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit your household name, family size, and notes.
        </p>
      </div>

      {household ? (
        <HouseholdSettingsEditor household={household} />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load household settings.</p>
      )}
    </div>
  );
}
