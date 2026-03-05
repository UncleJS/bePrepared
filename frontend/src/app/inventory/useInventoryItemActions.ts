import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EMPTY_ITEM_FORM } from "./constants";
import type { InventoryItem, ItemForm } from "./types";
import { asNumberOrUndef, itemToForm } from "./utils";

export function useInventoryItemActions({
  householdId,
  loadData,
  setError,
  onArchivedItem,
}: {
  householdId: string | null;
  loadData: (householdId: string) => Promise<void>;
  setError: (value: string | null) => void;
  onArchivedItem?: (itemId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<ItemForm>(EMPTY_ITEM_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_ITEM_FORM);

  const createItem = useCallback(async () => {
    if (!householdId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!createForm.name.trim()) {
        setError("Item name is required.");
        return;
      }
      const createdItem = await apiFetch<InventoryItem>(`/inventory/${householdId}/items`, {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          unit: createForm.unit.trim() || undefined,
          location: createForm.location.trim() || undefined,
          categoryId: createForm.categoryId || undefined,
          targetQty: asNumberOrUndef(createForm.targetQty),
          lowStockThreshold: asNumberOrUndef(createForm.lowStockThreshold),
          isTrackedByExpiry: createForm.isTrackedByExpiry,
          notes: createForm.notes.trim() || undefined,
        }),
      });

      const createQty = asNumberOrUndef(createForm.initialLotQty);
      if (createQty != null && createQty > 0) {
        await apiFetch(`/inventory/${householdId}/items/${createdItem.id}/lots`, {
          method: "POST",
          body: JSON.stringify({
            qty: createQty,
            acquiredAt: createForm.initialAcquiredAt || undefined,
            expiresAt: createForm.initialExpiresAt || undefined,
          }),
        });
      }

      setCreateForm(EMPTY_ITEM_FORM);
      setMessage("Inventory item added.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add inventory item.");
    } finally {
      setSaving(false);
    }
  }, [householdId, createForm, loadData, setError]);

  const startEdit = useCallback((item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm(itemToForm(item));
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
      await apiFetch(`/inventory/${householdId}/items/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          unit: editForm.unit.trim() || undefined,
          location: editForm.location.trim() || undefined,
          categoryId: editForm.categoryId || undefined,
          targetQty: asNumberOrUndef(editForm.targetQty),
          lowStockThreshold: asNumberOrUndef(editForm.lowStockThreshold),
          isTrackedByExpiry: editForm.isTrackedByExpiry,
          notes: editForm.notes.trim() || undefined,
        }),
      });
      setEditingId(null);
      setMessage("Inventory item updated.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update inventory item.");
    } finally {
      setSaving(false);
    }
  }, [householdId, editingId, editForm, loadData, setError]);

  const archiveItem = useCallback(
    async (itemId: string) => {
      if (!householdId) return;
      if (!window.confirm("Archive this inventory item?")) return;

      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        await apiFetch(`/inventory/${householdId}/items/${itemId}`, { method: "DELETE" });
        onArchivedItem?.(itemId);
        setMessage("Inventory item archived.");
        await loadData(householdId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to archive inventory item.");
      } finally {
        setSaving(false);
      }
    },
    [householdId, loadData, onArchivedItem, setError]
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
  };
}
