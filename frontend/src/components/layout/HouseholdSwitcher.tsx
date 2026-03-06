"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, resolveClientHouseholdId, setActiveHouseholdId } from "@/lib/api";

type Household = { id: string; name: string };

export function HouseholdSwitcher({
  sessionHouseholdId,
  isAdmin,
}: {
  sessionHouseholdId?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selected, setSelected] = useState(
    () =>
      resolveClientHouseholdId({ householdId: sessionHouseholdId, isAdmin }) ??
      sessionHouseholdId ??
      ""
  );

  useEffect(() => {
    void apiFetch<Household[]>("/households")
      .then((rows) => {
        setHouseholds(rows);
        setSelected((prev) => {
          if (!prev && rows[0]) {
            setActiveHouseholdId(rows[0].id);
            return rows[0].id;
          }
          return prev;
        });
      })
      .catch(() => {});
  }, []);

  if (!isAdmin || households.length <= 1) return null;

  const active = households.find((h) => h.id === selected);

  return (
    <label className="flex items-center gap-2">
      <span className="block text-xs font-bold uppercase tracking-wide text-primary">
        Active Family
      </span>
      <span className="rounded border border-border px-2 py-0.5 text-foreground">
        {active?.name ?? "Unknown"}
      </span>
      <select
        aria-label="Active family"
        value={selected}
        onChange={(e) => {
          const id = e.target.value;
          setSelected(id);
          setActiveHouseholdId(id);
          router.refresh();
        }}
        className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground"
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </label>
  );
}
