"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Household = {
  id: string;
  name: string;
  targetPeople: number;
  notes?: string | null;
};

export function HouseholdSettingsEditor({ household }: { household: Household }) {
  const [targetPeople, setTargetPeople] = useState(String(household.targetPeople));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    const people = Number(targetPeople);
    setMessage(null);
    setError(null);

    if (!Number.isInteger(people) || people < 1) {
      setError("Family size must be a whole number of at least 1.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/households/${household.id}`, {
        method: "PATCH",
        body: JSON.stringify({ targetPeople: people }),
      });
      setMessage("Household settings updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update household settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <label className="space-y-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-primary">
            Family Size (People)
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={targetPeople}
            onChange={(e) => setTargetPeople(e.target.value)}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Household"}
        </button>
      </div>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
