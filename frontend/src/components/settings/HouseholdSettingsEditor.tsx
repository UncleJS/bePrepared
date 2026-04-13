"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Household = {
  id: string;
  name: string;
  targetPeople: number;
  notes?: string | null;
};

export function HouseholdSettingsEditor({
  household,
  isAdmin,
  allHouseholds: initialAllHouseholds = [],
}: {
  household: Household;
  isAdmin: boolean;
  allHouseholds?: Household[];
}) {
  // ── Own household state ────────────────────────────────────────────────────
  const [name, setName] = useState(household.name);
  const [targetPeople, setTargetPeople] = useState(String(household.targetPeople));
  const [notes, setNotes] = useState(household.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Admin: manage all households ──────────────────────────────────────────
  const [allHouseholds, setAllHouseholds] = useState<Household[]>(initialAllHouseholds);
  const [newName, setNewName] = useState("");
  const [newTargetPeople, setNewTargetPeople] = useState("2");
  const [creating, setCreating] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  async function onSave() {
    const people = Number(targetPeople);
    setMessage(null);
    setError(null);

    if (!name.trim()) {
      setError("Household name is required.");
      return;
    }
    if (!Number.isInteger(people) || people < 1) {
      setError("Household size must be a whole number of at least 1.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/households/${household.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          targetPeople: people,
          notes: notes.trim() || null,
        }),
      });
      setMessage("Household settings updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update household settings.");
    } finally {
      setSaving(false);
    }
  }

  async function createHousehold() {
    setAdminMessage(null);
    setAdminError(null);
    const people = Number(newTargetPeople);

    if (!newName.trim()) {
      setAdminError("Household name is required.");
      return;
    }
    if (!Number.isInteger(people) || people < 1) {
      setAdminError("Household size must be at least 1.");
      return;
    }

    setCreating(true);
    try {
      await apiFetch("/households", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), targetPeople: people }),
      });
      setNewName("");
      setNewTargetPeople("2");
      setAdminMessage("Household created.");
      const rows = await apiFetch<Household[]>("/households");
      setAllHouseholds(rows);
    } catch (e) {
      setAdminError(e instanceof Error ? e.message : "Failed to create household.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Own household settings ── */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Household
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Household Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Household Size (People)
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

          <label className="space-y-1 md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this household"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm resize-none"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Household"}
        </button>

        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* ── Admin: manage all households ── */}
      {isAdmin && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Manage Households (Admin)
          </h2>

          {/* Household list */}
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Size</th>
                  <th className="text-left px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allHouseholds.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2.5 font-medium">{h.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{h.targetPeople}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{h.notes ?? "—"}</td>
                  </tr>
                ))}
                {allHouseholds.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-sm text-muted-foreground">
                      No households found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Create household form */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Create Household
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-primary">
                  Household Name *
                </span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Smith household"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-primary">
                  Household Size (People)
                </span>
                <input
                  type="number"
                  min={1}
                  value={newTargetPeople}
                  onChange={(e) => setNewTargetPeople(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void createHousehold()}
                  disabled={creating}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground w-full disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Household"}
                </button>
              </div>
            </div>
            {adminMessage && <p className="text-sm text-emerald-400">{adminMessage}</p>}
            {adminError && <p className="text-sm text-destructive">{adminError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
