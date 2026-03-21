"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, fmtDate } from "@/lib/api";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Alert = {
  id: string;
  title: string;
  detail?: string | null;
  severity: "upcoming" | "due" | "overdue";
  category: string;
  entityType: string;
  entityId: string;
  dueAt?: string | null;
  isResolved: boolean;
};

const ENTITY_LINK: Record<string, string> = {
  inventory_lot: "/inventory",
  maintenance_schedule: "/equipment",
};

const SEVERITY_LABEL: Record<string, string> = {
  overdue: "Overdue",
  due: "Due",
  upcoming: "Upcoming",
};

export default function DashboardAlerts({ householdId }: { householdId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiFetch<Alert[]>(`/alerts/${householdId}?status=active`)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = alerts.filter((a) => a.severity === "overdue").length;
  const due = alerts.filter((a) => a.severity === "due").length;
  const upcoming = alerts.filter((a) => a.severity === "upcoming").length;

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alerts</h2>
        <Link href="/alerts" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Overdue"
          value={overdue}
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
          highlight={overdue > 0}
          highlightClass="border-yellow-600/60"
        />
        <StatCard
          label="Due"
          value={due}
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
          highlight={due > 0}
          highlightClass="border-yellow-600/60"
        />
        <StatCard
          label="Upcoming"
          value={upcoming}
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
        />
      </div>

      {/* Alert cards */}
      {alerts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-primary shrink-0" />
          <p className="text-sm font-medium">All clear — no active alerts.</p>
        </div>
      ) : (
        <section>
          <div className="space-y-2">
            {alerts.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border px-4 py-3 flex items-start gap-3 text-sm ${
                  a.severity === "overdue"
                    ? "border-destructive/50 bg-destructive/10"
                    : a.severity === "due"
                      ? "border-yellow-600/40 bg-yellow-900/20"
                      : "border-border bg-card"
                }`}
              >
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-yellow-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{a.title}</p>
                  {a.detail && <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span
                      className={
                        a.severity === "overdue"
                          ? "text-destructive font-medium"
                          : a.severity === "due"
                            ? "text-yellow-400 font-medium"
                            : ""
                      }
                    >
                      {SEVERITY_LABEL[a.severity]}
                    </span>
                    {a.dueAt && <span>{fmtDate(a.dueAt)}</span>}
                    <span className="capitalize">{a.category.replace("_", " ")}</span>
                  </div>
                </div>
                {ENTITY_LINK[a.entityType] && (
                  <Link
                    href={ENTITY_LINK[a.entityType]}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-accent transition-colors shrink-0 self-center"
                  >
                    View →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
  highlightClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
  highlightClass?: string;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 flex flex-col gap-2 ${
        highlight && highlightClass ? highlightClass : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
