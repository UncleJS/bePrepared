import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EMPTY_EQUIPMENT_FORM } from "./constants";
import type { Equipment, EquipmentForm } from "./types";
import { toForm } from "./utils";

export function useEquipmentItemActions({
  householdId,
  loadData,
  loadArchived,
  showArchived,
  setError,
}: {
  householdId: string | null;
  loadData: (householdId: string) => Promise<void>;
  loadArchived: (householdId: string) => Promise<void>;
  showArchived: boolean;
  setError: (value: string | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<EquipmentForm>(EMPTY_EQUIPMENT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EquipmentForm>(EMPTY_EQUIPMENT_FORM);

  const reload = useCallback(
    async (hid: string) => {
      await loadData(hid);
      if (showArchived) await loadArchived(hid);
    },
    [loadData, loadArchived, showArchived]
  );

  const createItem = useCallback(async () => {
    if (!householdId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!createForm.name.trim()) {
        setError("Equipment name is required.");
        return;
      }
      await apiFetch(`/equipment/${householdId}`, {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          categoryId: createForm.categoryId || undefined,
          model: createForm.model.trim() || undefined,
          serialNo: createForm.serialNo.trim() || undefined,
          location: createForm.location.trim() || undefined,
          status: createForm.status,
          acquiredAt: createForm.acquiredAt || undefined,
          notes: createForm.notes.trim() || undefined,
        }),
      });
      setCreateForm(EMPTY_EQUIPMENT_FORM);
      setMessage("Equipment item added.");
      await reload(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add equipment item.");
    } finally {
      setSaving(false);
    }
  }, [householdId, createForm, reload, setError]);

  const startEdit = useCallback((item: Equipment) => {
    setEditingId(item.id);
    setEditForm(toForm(item));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveItemEdit = useCallback(async () => {
    if (!householdId || !editingId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/equipment/${householdId}/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          categoryId: editForm.categoryId || undefined,
          model: editForm.model.trim() || undefined,
          serialNo: editForm.serialNo.trim() || undefined,
          location: editForm.location.trim() || undefined,
          status: editForm.status,
          acquiredAt: editForm.acquiredAt || undefined,
          notes: editForm.notes.trim() || undefined,
        }),
      });
      setEditingId(null);
      setMessage("Equipment item updated.");
      await reload(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update equipment item.");
    } finally {
      setSaving(false);
    }
  }, [householdId, editingId, editForm, reload, setError]);

  const archiveItem = useCallback(
    async (id: string) => {
      if (!householdId) return;
      if (!window.confirm("Archive this equipment item?")) return;

      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        await apiFetch(`/equipment/${householdId}/${id}`, { method: "DELETE" });
        setMessage("Equipment item archived.");
        await reload(householdId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to archive equipment item.");
      } finally {
        setSaving(false);
      }
    },
    [householdId, reload, setError]
  );

  const restoreItem = useCallback(
    async (id: string) => {
      if (!householdId) return;
      if (!window.confirm("Restore this equipment item?")) return;

      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        await apiFetch(`/equipment/${householdId}/${id}/restore`, { method: "POST" });
        setMessage("Equipment item restored.");
        await reload(householdId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to restore equipment item.");
      } finally {
        setSaving(false);
      }
    },
    [householdId, reload, setError]
  );

  return {
    saving,
    message,
    createForm,
    setCreateForm,
    editingId,
    editForm,
    setEditForm,
    createItem,
    startEdit,
    cancelEdit,
    saveItemEdit,
    archiveItem,
    restoreItem,
  };
}
