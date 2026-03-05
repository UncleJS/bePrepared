"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, fmtTs } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Alert = {
  id: string;
  severity: "upcoming" | "due" | "overdue";
  category: string;
  title: string;
  detail?: string | null;
  dueAt?: string | null;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  overdue: <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />,
  due: <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />,
  upcoming: <AlertTriangle size={15} className="text-blue-400 shrink-0 mt-0.5" />,
};

const SEVERITY_BORDER: Record<string, string> = {
  overdue: "border-destructive/40 bg-destructive/10",
  due: "border-yellow-600/40 bg-yellow-900/15",
  upcoming: "border-border bg-card",
};

export default function AlertsPage() {
  const { householdId, status } = useActiveHouseholdId();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!householdId) return;
    apiFetch<Alert[]>(`/alerts/${householdId}`)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    if (!householdId) return;
    await apiFetch(`/alerts/${householdId}/${id}/read`, { method: "PATCH" });
    load();
  }

  async function resolve(id: string) {
    if (!householdId) return;
    await apiFetch(`/alerts/${householdId}/${id}/resolve`, { method: "PATCH" });
    load();
  }

  if (status === "loading")
    return <p className="text-muted-foreground text-sm">Loading session…</p>;
  if (!householdId)
    return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading alerts…</p>;

  const active = alerts.filter((a) => !a.isResolved);
  const resolved = alerts.filter((a) => a.isResolved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {active.length} active · {resolved.length} resolved
        </p>
      </div>

      {active.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <CheckCircle2 size={32} className="text-primary mx-auto mb-2" />
          <p className="font-medium">All clear!</p>
          <p className="text-muted-foreground text-sm mt-1">No active alerts.</p>
        </div>
      )}

      <div className="space-y-2">
        {active.map((a) => (
          <div
            key={a.id}
            className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${SEVERITY_BORDER[a.severity]}`}
          >
            {SEVERITY_ICON[a.severity]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.title}</p>
              {a.detail && <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>}
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{a.category.replace("_", " ")}</span>
                {a.dueAt && <span>Due: {a.dueAt.slice(0, 10)}</span>}
                <span>{fmtTs(a.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => markRead(a.id)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
              >
                Read
              </button>
              <button
                onClick={() => resolve(a.id)}
                className="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded border border-primary/30 hover:bg-primary/10 transition-colors"
              >
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
