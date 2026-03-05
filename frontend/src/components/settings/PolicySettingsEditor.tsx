"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type PolicyDefault = {
  key: string;
  valueDecimal?: string;
  valueInt?: number;
  unit: string;
  description?: string;
};

type HouseholdPolicy = PolicyDefault & { id: string };

type Props = {
  householdId: string;
  defaults: PolicyDefault[];
  overrides: HouseholdPolicy[];
};

function toNumeric(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  return Number(value);
}

export function PolicySettingsEditor({ householdId, defaults, overrides }: Props) {
  const [overrideMap, setOverrideMap] = useState<Record<string, HouseholdPolicy>>(
    Object.fromEntries(overrides.map((o) => [o.key, o]))
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seeded: Record<string, string> = {};
    for (const d of defaults) {
      const ov = overrides.find((o) => o.key === d.key);
      seeded[d.key] = String(ov?.valueDecimal ?? ov?.valueInt ?? d.valueDecimal ?? d.valueInt ?? "");
    }
    return seeded;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedDefaults = useMemo(() => [...defaults], [defaults]);

  async function saveOverride(d: PolicyDefault) {
    const raw = values[d.key]?.trim() ?? "";
    const parsed = Number(raw);

    setMessage(null);
    setError(null);

    if (!raw || Number.isNaN(parsed)) {
      setError(`Invalid value for ${d.key}. Enter a numeric value.`);
      return;
    }

    const defaultNum = toNumeric(d.valueDecimal ?? d.valueInt);
    const isIntKey = d.valueInt !== undefined && d.valueDecimal === undefined;
    const changedFromDefault = parsed !== defaultNum;

    setSavingKey(d.key);
    try {
      if (!changedFromDefault) {
        if (overrideMap[d.key]) {
          await apiFetch<{ reset: boolean }>(`/settings/${householdId}/policies/${d.key}`, {
            method: "DELETE",
          });
          setOverrideMap((prev) => {
            const next = { ...prev };
            delete next[d.key];
            return next;
          });
        }
        setMessage(`${d.key} reset to default.`);
        return;
      }

      const payload = isIntKey
        ? { unit: d.unit, valueInt: Math.round(parsed) }
        : { unit: d.unit, valueDecimal: parsed };

      const saved = await apiFetch<HouseholdPolicy>(`/settings/${householdId}/policies/${d.key}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setOverrideMap((prev) => ({ ...prev, [d.key]: saved }));
      setMessage(`${d.key} updated.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save policy override.");
    } finally {
      setSavingKey(null);
    }
  }

  async function resetOverride(d: PolicyDefault) {
    if (!overrideMap[d.key]) return;

    setSavingKey(d.key);
    setMessage(null);
    setError(null);

    try {
      await apiFetch<{ reset: boolean }>(`/settings/${householdId}/policies/${d.key}`, {
        method: "DELETE",
      });

      setOverrideMap((prev) => {
        const next = { ...prev };
        delete next[d.key];
        return next;
      });

      setValues((prev) => ({
        ...prev,
        [d.key]: String(d.valueDecimal ?? d.valueInt ?? ""),
      }));

      setMessage(`${d.key} reset to default.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset policy override.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Key</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">System Default</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Value</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Unit</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedDefaults.map((d) => {
              const override = overrideMap[d.key];
              const defaultVal = d.valueDecimal ?? String(d.valueInt ?? "—");
              const busy = savingKey === d.key;

              return (
                <tr key={d.key} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-primary">{d.key}</td>
                  <td className="px-4 py-2.5 font-mono">{defaultVal}</td>
                  <td className="px-4 py-2.5">
                    <label className="space-y-1">
                      <span className="block text-xs font-bold uppercase tracking-wide text-primary">Override Value</span>
                      <input
                        id={`policy-${d.key}`}
                        aria-label={`Override value for ${d.key}`}
                        type="number"
                        step={d.valueDecimal !== undefined ? "0.0001" : "1"}
                        value={values[d.key] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [d.key]: e.target.value,
                          }))
                        }
                        className="w-36 rounded-md border border-border bg-muted px-2 py-1 text-sm"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{d.unit}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{d.description ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveOverride(d)}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={busy || !override}
                        onClick={() => resetOverride(d)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedDefaults.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No policy defaults. Run seed data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
