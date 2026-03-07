import { apiFetch, getSessionHouseholdId } from "@/lib/api";
import { PolicySettingsEditor } from "@/components/settings/PolicySettingsEditor";
import { ScenarioPolicySettingsEditor } from "@/components/settings/ScenarioPolicySettingsEditor";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type PolicyDefault = {
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
  description?: string;
};

type HouseholdPolicy = PolicyDefault & { id: string };
type ScenarioPolicy = PolicyDefault & { id: string };

async function getData(householdId: string) {
  const [defaults, overrides, sip, evac] = await Promise.allSettled([
    apiFetch<PolicyDefault[]>("/settings/defaults"),
    apiFetch<HouseholdPolicy[]>(`/settings/${householdId}/policies`),
    apiFetch<ScenarioPolicy[]>(`/settings/${householdId}/scenario/shelter_in_place`),
    apiFetch<ScenarioPolicy[]>(`/settings/${householdId}/scenario/evacuation`),
  ]);

  return {
    defaults: defaults.status === "fulfilled" ? defaults.value : [],
    overrides: overrides.status === "fulfilled" ? overrides.value : [],
    scenarioPolicies: {
      shelter_in_place: sip.status === "fulfilled" ? sip.value : [],
      evacuation: evac.status === "fulfilled" ? evac.value : [],
    },
  };
}

export default async function PoliciesPage() {
  const householdId = await getSessionHouseholdId();
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  const { defaults, overrides, scenarioPolicies } = await getData(householdId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/settings"
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
