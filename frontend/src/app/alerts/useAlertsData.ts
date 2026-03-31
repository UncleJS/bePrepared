import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Alert } from "./types";

export function useAlertsData(householdId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await apiFetch<Alert[]>(`/alerts/${householdId}`);
      setAlerts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { alerts, loading, error, load };
}
