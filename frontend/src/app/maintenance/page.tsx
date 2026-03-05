"use client";

import { useEffect, useState } from "react";
import { apiFetch, fmtDate, daysUntil } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";

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

type EquipmentItem = { id: string; name: string; categorySlug?: string };
type Template = { id: string; name: string; defaultCalDays?: number; graceDays?: number };

export default function MaintenancePage() {
  const { householdId, status } = useActiveHouseholdId();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    equipmentItemId: "",
    templateId: "",
    name: "",
    calDays: "",
    graceDays: "7",
    nextDueAt: "",
  });

  useEffect(() => {
    if (!householdId) return;

    Promise.all([
      apiFetch<Schedule[]>(`/maintenance/${householdId}/schedules`),
      apiFetch<EquipmentItem[]>(`/equipment/${householdId}`),
      apiFetch<Template[]>(`/maintenance/templates`),
    ])
      .then(([s, e, t]) => {
        setSchedules(s);
        setEquipment(e);
        setTemplates(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load maintenance data."))
      .finally(() => setLoading(false));
  }, [householdId]);

  if (status === "loading")
    return <p className="text-muted-foreground text-sm">Loading session…</p>;
  if (!householdId)
    return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading maintenance…</p>;

  const sorted = [...schedules].sort((a, b) => {
    const da = daysUntil(a.nextDueAt) ?? 9999;
    const db = daysUntil(b.nextDueAt) ?? 9999;
    return da - db;
  });

  async function createSchedule() {
    if (!householdId) return;
    if (!form.equipmentItemId || !form.name.trim()) {
      setError("Equipment and schedule name are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/maintenance/${householdId}/${form.equipmentItemId}/schedules`, {
        method: "POST",
        body: JSON.stringify({
          templateId: form.templateId || undefined,
          name: form.name.trim(),
          calDays: form.calDays ? Number(form.calDays) : undefined,
          graceDays: form.graceDays ? Number(form.graceDays) : undefined,
          nextDueAt: form.nextDueAt || undefined,
        }),
      });
      setForm({
        equipmentItemId: "",
        templateId: "",
        name: "",
        calDays: "",
        graceDays: "7",
        nextDueAt: "",
      });
      setMessage("Maintenance schedule created.");
      const rows = await apiFetch<Schedule[]>(`/maintenance/${householdId}/schedules`);
      setSchedules(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create maintenance schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="text-muted-foreground text-sm mt-1">{schedules.length} schedules active</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Define Maintenance Schedule
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Equipment Item
            </label>
            <select
              value={form.equipmentItemId}
              onChange={(e) => setForm((f) => ({ ...f, equipmentItemId: e.target.value }))}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="">Select equipment</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Maintenance Template
            </label>
            <select
              value={form.templateId}
              onChange={(e) => {
                const templateId = e.target.value;
                const t = templates.find((x) => x.id === templateId);
                setForm((f) => ({
                  ...f,
                  templateId,
                  name: t?.name ?? f.name,
                  calDays: t?.defaultCalDays != null ? String(t.defaultCalDays) : f.calDays,
                  graceDays: t?.graceDays != null ? String(t.graceDays) : f.graceDays,
                }));
              }}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="">Select template (optional)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Schedule Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="Filter change"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Interval (days)
            </label>
            <input
              value={form.calDays}
              onChange={(e) => setForm((f) => ({ ...f, calDays: e.target.value }))}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="30"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Grace Period (days)
            </label>
            <input
              value={form.graceDays}
              onChange={(e) => setForm((f) => ({ ...f, graceDays: e.target.value }))}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="7"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Next Due Date
            </label>
            <input
              type="date"
              value={form.nextDueAt}
              onChange={(e) => setForm((f) => ({ ...f, nextDueAt: e.target.value }))}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={createSchedule}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Schedule"}
        </button>
      </section>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

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
