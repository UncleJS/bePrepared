"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Household = {
  id: string;
  name: string;
  targetPeople: number;
};

export function HouseholdManager() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [name, setName] = useState("");
  const [targetPeople, setTargetPeople] = useState("2");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      // Only show this section to admins — check role before rendering anything
      const me = await apiFetch<{ isAdmin: boolean }>("/users/me");
      if (!me.isAdmin) {
        setVisible(false);
        return;
      }
      const rows = await apiFetch<Household[]>("/households");
      setHouseholds(rows);
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createHousehold() {
    setMessage(null);
    setError(null);
    const people = Number(targetPeople);

    if (!name.trim()) {
      setError("Family name is required.");
      return;
    }
    if (!Number.isInteger(people) || people < 1) {
      setError("Target people must be at least 1.");
      return;
    }

    try {
      await apiFetch("/households", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), targetPeople: people }),
      });
      setName("");
      setTargetPeople("2");
      setMessage("Family created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create family.");
    }
  }

  if (!visible) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Families Admin</h2>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Families (Admin)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Family Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Smith household"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">
              Family Size (People)
            </span>
            <input
              type="number"
              min={1}
              value={targetPeople}
              onChange={(e) => setTargetPeople(e.target.value)}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={createHousehold}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground self-end"
          >
            Create Family
          </button>
        </div>

        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">People</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {households.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2.5">{h.name}</td>
                  <td className="px-4 py-2.5">{h.targetPeople}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
