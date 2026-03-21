"use client";

import { useEffect } from "react";
import { fmtDate, daysUntil } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Pencil } from "lucide-react";
import { useMaintenanceActions } from "./useMaintenanceActions";
import { useMaintenanceData } from "./useMaintenanceData";

export default function MaintenancePage() {
  const { householdId, status } = useActiveHouseholdId();
  const {
    equipment,
    templates,
    loading,
    error,
    setError,
    loadData,
    loadSchedules,
    equipmentMap,
    sortedSchedules,
  } = useMaintenanceData();
  const {
    saving,
    message,
    form,
    setForm,
    editingId,
    editForm,
    setEditForm,
    createSchedule,
    startEdit,
    cancelEdit,
    saveScheduleEdit,
  } = useMaintenanceActions({ householdId, reloadSchedules: loadSchedules, setError });

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId, loadData]);

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading session…</p>;
  }
  if (!householdId) {
    return <p className="text-sm text-muted-foreground">No household in session.</p>;
  }
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading maintenance…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sortedSchedules.length} schedules active
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Define Maintenance Schedule
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Equipment Item
            </label>
            <select
              value={form.equipmentItemId}
              onChange={(e) =>
                setForm((current) => ({ ...current, equipmentItemId: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="">Select equipment</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
                const template = templates.find((row) => row.id === templateId);
                setForm((current) => ({
                  ...current,
                  templateId,
                  name: template?.name ?? current.name,
                  calDays:
                    template?.defaultCalDays != null
                      ? String(template.defaultCalDays)
                      : current.calDays,
                  graceDays:
                    template?.graceDays != null ? String(template.graceDays) : current.graceDays,
                }));
              }}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            >
              <option value="">Select template (optional)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
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
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
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
              onChange={(e) => setForm((current) => ({ ...current, calDays: e.target.value }))}
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
              onChange={(e) => setForm((current) => ({ ...current, graceDays: e.target.value }))}
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
              onChange={(e) => setForm((current) => ({ ...current, nextDueAt: e.target.value }))}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createSchedule()}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Schedule"}
        </button>
      </section>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Equipment</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Schedule</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Interval</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Last Done</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Next Due</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedSchedules.map((schedule) => {
              const days = daysUntil(schedule.nextDueAt);
              let statusLabel = "OK";
              let statusClass = "text-primary";

              if (!schedule.isActive) {
                statusLabel = "Inactive";
                statusClass = "text-muted-foreground";
              } else if (days !== null) {
                if (days < 0) {
                  statusLabel = `Overdue ${Math.abs(days)}d`;
                  statusClass = "font-semibold text-destructive";
                } else if (days <= schedule.graceDays) {
                  statusLabel = `Due in ${days}d`;
                  statusClass = "font-medium text-yellow-400";
                } else {
                  statusLabel = `${days}d`;
                  statusClass = "text-muted-foreground";
                }
              }

              return (
                <tr
                  key={schedule.id}
                  className={`transition-colors hover:bg-accent/30 ${!schedule.isActive ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {equipmentMap[schedule.equipmentItemId] ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{schedule.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {schedule.calDays ? `${schedule.calDays}d` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {fmtDate(schedule.lastDoneAt)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {fmtDate(schedule.nextDueAt)}
                  </td>
                  <td className={`px-4 py-2.5 ${statusClass}`}>{statusLabel}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(schedule)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {sortedSchedules.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No maintenance schedules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Edit Maintenance Schedule
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Schedule Name
              </label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Interval (days)
              </label>
              <input
                value={editForm.calDays}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, calDays: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                placeholder="30"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Grace Period (days)
              </label>
              <input
                value={editForm.graceDays}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, graceDays: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                placeholder="7"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Last Done Date
              </label>
              <input
                type="date"
                value={editForm.lastDoneAt}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, lastDoneAt: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Next Due Date
              </label>
              <input
                type="date"
                value={editForm.nextDueAt}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, nextDueAt: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Active
              </label>
              <div className="flex h-[38px] items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.isActive}
                  onClick={() =>
                    setEditForm((current) => ({ ...current, isActive: !current.isActive }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    editForm.isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="ml-2 text-sm text-muted-foreground">
                  {editForm.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void saveScheduleEdit()}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
