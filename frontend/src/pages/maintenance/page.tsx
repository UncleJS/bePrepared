"use client";

import { useEffect, useState } from "react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormSheet } from "@/components/ui/FormSheet";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MaintenanceFormFields } from "./MaintenanceFormFields";
import { MaintenanceRow } from "./MaintenanceRow";
import { useMaintenanceActions } from "./useMaintenanceActions";
import { useMaintenanceData } from "./useMaintenanceData";

export default function MaintenancePage() {
  const { householdId, status } = useActiveHouseholdId();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  useEffect(() => {
    if (!editingId) setEditOpen(false);
  }, [editingId]);

  useEffect(() => {
    if (message === "Maintenance schedule created.") setCreateOpen(false);
  }, [message]);

  if (status === "loading") return <LoadingSpinner label="Loading session…" />;
  if (!householdId)
    return (
      <EmptyState
        title="No household in session"
        description="Select a household to manage maintenance."
      />
    );
  if (loading) return <LoadingSpinner label="Loading maintenance…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sortedSchedules.length} schedules active
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={14} /> Add schedule
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? (
        <ErrorBanner
          message={error}
          retry={householdId ? () => void loadData(householdId) : undefined}
        />
      ) : null}

      {sortedSchedules.length === 0 ? (
        <EmptyState
          title="No maintenance schedules configured"
          description="Add recurring service reminders for generators, filters, batteries, and other equipment."
          action={{ label: "Add schedule", onClick: () => setCreateOpen(true) }}
        />
      ) : (
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
              {sortedSchedules.map((schedule) => (
                <MaintenanceRow
                  key={schedule.id}
                  schedule={schedule}
                  equipmentName={equipmentMap[schedule.equipmentItemId] ?? "—"}
                  onEdit={(row) => {
                    startEdit(row);
                    setEditOpen(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Define maintenance schedule"
        description="Create preventive maintenance reminders using equipment and template defaults."
      >
        <MaintenanceFormFields
          form={form}
          setForm={setForm}
          equipment={equipment}
          templates={templates}
          showEquipment
          showTemplate
          onTemplateChange={(templateId) => {
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
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void createSchedule()}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create schedule"}
          </button>
        </div>
      </FormSheet>

      <FormSheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) cancelEdit();
        }}
        title="Edit maintenance schedule"
        description="Update intervals, due dates, and active status."
      >
        <MaintenanceFormFields form={editForm} setForm={setEditForm} showLastDone showActive />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditOpen(false);
              cancelEdit();
            }}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveScheduleEdit()}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </FormSheet>
    </div>
  );
}
