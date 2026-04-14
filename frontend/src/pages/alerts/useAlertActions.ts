import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function useAlertActions({
  householdId,
  reload,
}: {
  householdId: string | null;
  reload: () => Promise<void> | void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markRead(id: string) {
    if (!householdId) return;
    setError(null);
    try {
      await apiFetch(`/alerts/${householdId}/${id}/read`, { method: "PATCH" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark alert as read.");
    }
  }

  async function resolve(id: string) {
    if (!householdId) return;
    setError(null);
    try {
      await apiFetch(`/alerts/${householdId}/${id}/resolve`, { method: "PATCH" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve alert.");
    }
  }

  async function runJob() {
    setRefreshing(true);
    setError(null);
    try {
      await apiFetch("/admin/alerts/run-job", { method: "POST" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh alerts.");
    } finally {
      setRefreshing(false);
    }
  }

  return { markRead, resolve, runJob, refreshing, error, setError };
}
