"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type PolicyDefault = {
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
  description?: string;
};

type ScenarioPolicy = {
  id: string;
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
};

type Scenario = "shelter_in_place" | "evacuation";

const SCENARIOS: Array<{ key: Scenario; label: string }> = [
  { key: "shelter_in_place", label: "Shelter in Place" },
  { key: "evacuation", label: "Evacuation" },
];

export function ScenarioPolicySettingsEditor({
  householdId,
  defaults,
  scenarioPolicies,
}: {
  householdId: string;
  defaults: PolicyDefault[];
  scenarioPolicies: Record<Scenario, ScenarioPolicy[]>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seeded: Record<string, string> = {};
    for (const scenario of SCENARIOS) {
      for (const d of defaults) {
        const row = scenarioPolicies[scenario.key]?.find((p) => p.key === d.key);
        seeded[`${scenario.key}:${d.key}`] = String(row?.valueDecimal ?? row?.valueInt ?? "");
      }
    }
    return seeded;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveScenarioValue(scenario: Scenario, d: PolicyDefault) {
    const valueKey = `${scenario}:${d.key}`;
    const raw = values[valueKey]?.trim() ?? "";
    setError(null);
    setMessage(null);

    if (!raw) {
      setMessage(`Leave blank to use household/default for ${d.key} (${scenario}).`);
      return;
    }

    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setError(`Invalid number for ${d.key} (${scenario}).`);
      return;
    }

    setSavingKey(valueKey);
    try {
      const payload =
        d.valueInt !== undefined && d.valueDecimal === undefined
          ? { unit: d.unit, valueInt: Math.round(parsed) }
          : { unit: d.unit, valueDecimal: parsed };

      await apiFetch(`/settings/${householdId}/scenario/${scenario}/${d.key}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage(`${d.key} saved for ${scenario}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save scenario override.");
    } finally {
      setSavingKey(null);
    }
  }

  const focusKeys = defaults.filter((d) =>
    [
      "water_liters_per_person_per_day",
      "calories_kcal_per_person_per_day",
      "alert_upcoming_days",
      "alert_grace_days",
    ].includes(d.key)
  );

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {SCENARIOS.map((scenario) => (
        <section
          key={scenario.key}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {scenario.label}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {focusKeys.map((d) => {
              const valueKey = `${scenario.key}:${d.key}`;
              const busy = savingKey === valueKey;
              return (
                <div
                  key={valueKey}
                  className="rounded-md border border-border bg-muted/40 p-3 space-y-2"
                >
                  <p className="text-xs font-mono text-primary">{d.key}</p>
                  <div className="flex items-center gap-2">
                    <label className="space-y-1 w-full">
                      <span className="block text-xs font-bold uppercase tracking-wide text-primary">
                        Override Value
                      </span>
                      <input
                        id={`scenario-${valueKey}`}
                        aria-label={`Override value for ${d.key} in ${scenario.label}`}
                        type="number"
                        step={d.valueDecimal !== undefined ? "0.0001" : "1"}
                        value={values[valueKey] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [valueKey]: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
                      />
                    </label>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {d.unit}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveScenarioValue(scenario.key, d)}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.description ?? "Scenario override"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
