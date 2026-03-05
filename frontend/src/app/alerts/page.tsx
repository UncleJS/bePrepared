"use client";

import { useEffect, useState } from "react";
import { apiFetch, fmtTs, HOUSEHOLD_ID } from "@/lib/api";
import { Bell, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type Alert = {
  id: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string;
  dueDate?: string;
  status: "active" | "read" | "resolved" | "snoozed";
  createdAt: string;
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />,
  warning:  <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />,
  info:     <Bell size={15} className="text-blue-400 shrink-0 mt-0.5" />,
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10",
  warning:  "border-yellow-600/40 bg-yellow-900/15",
  info:     "border-border bg-card",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiFetch<Alert[]>(`/alerts/${HOUSEHOLD_ID}`)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function markRead(id: string) {
    await apiFetch(`/alerts/${HOUSEHOLD_ID}/${id}/read`, { method: "PATCH" });
    load();
  }

  async function resolve(id: string) {
    await apiFetch(`/alerts/${HOUSEHOLD_ID}/${id}/resolve`, { method: "PATCH" });
    load();
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading alerts…</p>;

  const active   = alerts.filter((a) => a.status === "active");
  const resolved = alerts.filter((a) => a.status === "resolved");

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
              {a.body && <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>}
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{a.alertType.replace("_", " ")}</span>
                {a.dueDate && <span>Due: {a.dueDate}</span>}
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
