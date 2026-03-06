import { apiFetch, getSessionHouseholdId } from "@/lib/api";
import { HouseholdSettingsEditor } from "@/components/settings/HouseholdSettingsEditor";
import { HouseholdManager } from "@/components/settings/HouseholdManager";
import { PolicySettingsEditor } from "@/components/settings/PolicySettingsEditor";
import { ScenarioPolicySettingsEditor } from "@/components/settings/ScenarioPolicySettingsEditor";
import Link from "next/link";

type PolicyDefault = {
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
  description?: string;
};

type HouseholdPolicy = PolicyDefault & { id: string };
type ScenarioPolicy = PolicyDefault & { id: string };
type Household = {
  id: string;
  name: string;
  targetPeople: number;
  notes?: string | null;
};

async function getData(householdId: string) {
  const [household, defaults, overrides, sip, evac] = await Promise.allSettled([
    apiFetch<Household>(`/households/${householdId}`),
    apiFetch<PolicyDefault[]>("/settings/defaults"),
    apiFetch<HouseholdPolicy[]>(`/settings/${householdId}/policies`),
    apiFetch<ScenarioPolicy[]>(`/settings/${householdId}/scenario/shelter_in_place`),
    apiFetch<ScenarioPolicy[]>(`/settings/${householdId}/scenario/evacuation`),
  ]);

  return {
    household: household.status === "fulfilled" ? household.value : null,
    defaults: defaults.status === "fulfilled" ? defaults.value : [],
    overrides: overrides.status === "fulfilled" ? overrides.value : [],
    scenarioPolicies: {
      shelter_in_place: sip.status === "fulfilled" ? sip.value : [],
      evacuation: evac.status === "fulfilled" ? evac.value : [],
    },
  };
}

export default async function SettingsPage() {
  const householdId = await getSessionHouseholdId();
  if (!householdId)
    return <p className="text-sm text-muted-foreground">No household in session.</p>;

  const { household, defaults, overrides, scenarioPolicies } = await getData(householdId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Policy defaults and household overrides. Edit values inline and save.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Household</h2>
        {household ? (
          <HouseholdSettingsEditor household={household} />
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load household settings.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Category Management</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/settings/inventory-categories"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            Inventory Categories
          </Link>
          <Link
            href="/settings/equipment-categories"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            Equipment Categories
          </Link>
        </div>
      </section>

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

      <section>
        <HouseholdManager />
      </section>
    </div>
  );
}
