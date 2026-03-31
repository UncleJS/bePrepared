"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";

type Alert = {
  id: string;
  isResolved: boolean;
};

export function AlertBadge() {
  const { householdId } = useActiveHouseholdId();
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    if (!householdId) {
      setCount(0);
      return;
    }

    void apiFetch<Alert[]>(`/alerts/${householdId}?status=active`)
      .then((rows) => setCount(rows.filter((row) => !row.isResolved).length))
      .catch(() => setCount(0));
  }, [householdId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <Link
      href="/alerts"
      className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Bell size={14} />
      <span className="hidden sm:inline">Alerts</span>
      <span className="inline-flex min-w-5 justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
        {count}
      </span>
    </Link>
  );
}
