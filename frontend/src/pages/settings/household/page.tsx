import { useEffect, useState } from "react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { apiFetch } from "@/lib/api";
import { HouseholdSettingsEditor } from "@/components/settings/HouseholdSettingsEditor";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Household = {
  id: string;
  name: string;
  targetPeople: number;
  notes?: string | null;
};

export default function HouseholdPage() {
  const { householdId, isLoading, user } = useActiveHouseholdId();
  const isAdmin = user?.isAdmin ?? false;
  const [household, setHousehold] = useState<Household | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    const fetches: Promise<void>[] = [
      apiFetch<Household>(`/households/${householdId}`)
        .then(setHousehold)
        .catch(() => {}),
    ];
    if (isAdmin) {
      fetches.push(
        apiFetch<Household[]>("/households")
          .then(setAllHouseholds)
          .catch(() => {})
      );
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [householdId, isAdmin]);

  if (isLoading || loading) return <LoadingSpinner label="Loading…" />;
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-2xl font-bold">Household</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit your household name, size, and notes.
        </p>
      </div>

      {household ? (
        <HouseholdSettingsEditor
          household={household}
          isAdmin={isAdmin}
          allHouseholds={allHouseholds}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load household settings.</p>
      )}
    </div>
  );
}
