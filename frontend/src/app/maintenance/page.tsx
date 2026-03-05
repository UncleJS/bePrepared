"use client";

import { useEffect, useState } from "react";
import { apiFetch, fmtDate, daysUntil, HOUSEHOLD_ID } from "@/lib/api";
import { Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";

type Schedule = {
  id: string;
  equipmentItemId: string;
  name: string;
  calDays?: number;
  nextDueAt?: string;
  lastDoneAt?: string;
  graceDays: number;
  isActive: boolean;
};

export default function MaintenancePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiFetch<Schedule[]>(`/maintenance/${HOUSEHOLD_ID}/schedules`)
      .then(setSchedules)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading maintenance…</p>;

  const sorted = [...schedules].sort((a, b) => {
    const da = daysUntil(a.nextDueAt) ?? 9999;
    const db = daysUntil(b.nextDueAt) ?? 9999;
    return da - db;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="text-muted-foreground text-sm mt-1">{schedules.length} schedules active</p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Schedule</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Interval</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Last Done</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Next Due</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((s) => {
              const days = daysUntil(s.nextDueAt);
              let statusLabel = "OK";
              let statusClass = "text-primary";

              if (days !== null) {
                if (days < 0) {
                  statusLabel = `Overdue ${Math.abs(days)}d`;
                  statusClass = "text-destructive font-semibold";
                } else if (days <= s.graceDays) {
                  statusLabel = `Due in ${days}d`;
                  statusClass = "text-yellow-400 font-medium";
                } else {
                  statusLabel = `${days}d`;
                  statusClass = "text-muted-foreground";
                }
              }

              return (
                <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.calDays ? `${s.calDays}d` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(s.lastDoneAt)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(s.nextDueAt)}</td>
                  <td className={`px-4 py-2.5 ${statusClass}`}>{statusLabel}</td>
                </tr>
              );
            })}
            {schedules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No maintenance schedules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
