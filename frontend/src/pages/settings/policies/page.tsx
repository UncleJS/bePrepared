import { useEffect, useState } from "react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { apiFetch } from "@/lib/api";
import { PolicySettingsEditor } from "@/components/settings/PolicySettingsEditor";
import { ScenarioPolicySettingsEditor } from "@/components/settings/ScenarioPolicySettingsEditor";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type PolicyDefault = {
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
  description?: string;
};

type HouseholdPolicy = PolicyDefault & { id: string };
type ScenarioPolicy = PolicyDefault & { id: string };

type ScenarioPolicies = {
  shelter_in_place: ScenarioPolicy[];
  evacuation: ScenarioPolicy[];
};

export default function PoliciesPage() {
  const { householdId, isLoading } = useActiveHouseholdId();
  const [defaults, setDefaults] = useState<PolicyDefault[]>([]);
  const [overrides, setOverrides] = useState<HouseholdPolicy[]>([]);
  const [scenarioPolicies, setScenarioPolicies] = useState<ScenarioPolicies>({
    shelter_in_place: [],
    evacuation: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    Promise.allSettled([
      apiFetch<PolicyDefault[]>("/settings/defaults"),
      apiFetch<HouseholdPolicy[]>(`/settings/${householdId}/policies`),
      apiFetch<ScenarioPolicy[]>(`/settings/${householdId}/scenario/shelter_in_place`),
      apiFetch<ScenarioPolicy[]>(`/settings/${householdId}/scenario/evacuation`),
    ])
      .then(([d, o, s, e]) => {
        setDefaults(d.status === "fulfilled" ? d.value : []);
        setOverrides(o.status === "fulfilled" ? o.value : []);
        setScenarioPolicies({
          shelter_in_place: s.status === "fulfilled" ? s.value : [],
          evacuation: e.status === "fulfilled" ? e.value : [],
        });
      })
      .finally(() => setLoading(false));
  }, [householdId]);

  if (isLoading || loading) return <LoadingSpinner label="Loading policies…" />;
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-2xl font-bold">Policies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Household policy overrides and scenario-specific planning values.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Policy Defaults</h2>
        <PolicySettingsEditor householdId={householdId} defaults={defaults} overrides={overrides} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Scenario Overrides</h2>
        <ScenarioPolicySettingsEditor
          householdId={householdId}
          defaults={defaults}
          scenarioPolicies={scenarioPolicies}
        />
      </section>
    </div>
  );
}
