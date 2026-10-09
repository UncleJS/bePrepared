import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Alert } from "./types";

export function useAlertsData(householdId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    if (!householdId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const requestId = ++generation.current;
    setLoading(true);
    setError(null);
    setAlerts([]);
    try {
      const rows = await apiFetch<Alert[]>(`/alerts/${householdId}`);
      if (requestId !== generation.current) return;
      setAlerts(rows);
    } catch (err) {
      if (requestId !== generation.current) return;
      setAlerts([]);
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { alerts, loading, error, load };
}
