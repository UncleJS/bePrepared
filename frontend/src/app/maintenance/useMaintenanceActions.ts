import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { EMPTY_EDIT_FORM, scheduleToForm, type Schedule } from "./types";

type CreateForm = {
  equipmentItemId: string;
  templateId: string;
  name: string;
  calDays: string;
  graceDays: string;
  nextDueAt: string;
};

const EMPTY_CREATE_FORM: CreateForm = {
  equipmentItemId: "",
  templateId: "",
  name: "",
  calDays: "",
  graceDays: "7",
  nextDueAt: "",
};

type Options = {
  householdId: string | null;
  reloadSchedules: (householdId: string) => Promise<void>;
  setError: (error: string | null) => void;
};

export function useMaintenanceActions({ householdId, reloadSchedules, setError }: Options) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

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
      setForm(EMPTY_CREATE_FORM);
      setMessage("Maintenance schedule created.");
      await reloadSchedules(householdId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create maintenance schedule.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(schedule: Schedule) {
    setEditingId(schedule.id);
    setEditForm(scheduleToForm(schedule));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_EDIT_FORM);
  }

  async function saveScheduleEdit() {
    if (!householdId || !editingId) return;
    if (!editForm.name.trim()) {
      setError("Schedule name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/maintenance/${householdId}/schedules/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          calDays: editForm.calDays ? Number(editForm.calDays) : undefined,
          graceDays: editForm.graceDays ? Number(editForm.graceDays) : undefined,
          nextDueAt: editForm.nextDueAt || undefined,
          lastDoneAt: editForm.lastDoneAt || undefined,
          isActive: editForm.isActive,
        }),
      });
      setEditingId(null);
      setEditForm(EMPTY_EDIT_FORM);
      setMessage("Maintenance schedule updated.");
      await reloadSchedules(householdId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update maintenance schedule.");
    } finally {
      setSaving(false);
    }
  }

  return {
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
  };
}
