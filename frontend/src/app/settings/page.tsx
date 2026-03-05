import { apiFetch, HOUSEHOLD_ID } from "@/lib/api";

type PolicyDefault = {
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
  description?: string;
};

type HouseholdPolicy = PolicyDefault & { id: string };

async function getData() {
  const [defaults, overrides] = await Promise.allSettled([
    apiFetch<PolicyDefault[]>("/settings/defaults"),
    apiFetch<HouseholdPolicy[]>(`/settings/${HOUSEHOLD_ID}/policies`),
  ]);

  return {
    defaults:  defaults.status  === "fulfilled" ? defaults.value  : [],
    overrides: overrides.status === "fulfilled" ? overrides.value : [],
  };
}

export default async function SettingsPage() {
  const { defaults, overrides } = await getData();

  const overrideMap = Object.fromEntries(overrides.map((o) => [o.key, o]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Policy defaults and household overrides. Use the API / Swagger to change values.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Policy Defaults</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Key</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">System Default</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Household Override</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Unit</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {defaults.map((d) => {
                const override = overrideMap[d.key];
                const defaultVal = d.valueDecimal ?? String(d.valueInt ?? "—");
                const overrideVal = override
                  ? (override.valueDecimal ?? String(override.valueInt ?? "—"))
                  : null;

                return (
                  <tr key={d.key} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-primary">{d.key}</td>
                    <td className="px-4 py-2.5 font-mono">{defaultVal}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {overrideVal ? (
                        <span className="text-yellow-400">{overrideVal}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{d.unit}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{d.description ?? "—"}</td>
                  </tr>
                );
              })}
              {defaults.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No policy defaults. Run seed data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Changing Policy Values</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Use the Swagger UI at{" "}
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener"
            className="text-primary underline underline-offset-2"
          >
            /api/docs
          </a>{" "}
          to set overrides:
        </p>
        <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto">
{`PUT /settings/${HOUSEHOLD_ID}/policies/water_liters_per_person_per_day
{
  "unit": "liters/person/day",
  "valueDecimal": 6.0
}`}
        </pre>
      </section>
    </div>
  );
}
