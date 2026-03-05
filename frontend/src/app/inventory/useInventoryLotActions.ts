import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EMPTY_LOT_FORM } from "./constants";
import type { InventoryLot, LotForm } from "./types";
import { asNumberOrUndef, lotToForm } from "./utils";

export function useInventoryLotActions({
  householdId,
  selectedItemId,
  loadData,
  setError,
}: {
  householdId: string | null;
  selectedItemId: string | null;
  loadData: (householdId: string) => Promise<void>;
  setError: (value: string | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lotCreateForm, setLotCreateForm] = useState<LotForm>(EMPTY_LOT_FORM);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [lotEditForm, setLotEditForm] = useState<LotForm>(EMPTY_LOT_FORM);

  const startLotEdit = useCallback((lot: InventoryLot) => {
    setEditingLotId(lot.id);
    setLotEditForm(lotToForm(lot));
  }, []);

  const cancelLotEdit = useCallback(() => {
    setEditingLotId(null);
  }, []);

  const resetLotPanel = useCallback(() => {
    setEditingLotId(null);
    setLotCreateForm(EMPTY_LOT_FORM);
  }, []);

  const addLot = useCallback(async () => {
    if (!householdId || !selectedItemId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const qty = asNumberOrUndef(lotCreateForm.qty);
      if (qty == null || qty < 0) {
        setError("Lot quantity must be 0 or greater.");
        return;
      }
      await apiFetch(`/inventory/${householdId}/items/${selectedItemId}/lots`, {
        method: "POST",
        body: JSON.stringify({
          qty,
          acquiredAt: lotCreateForm.acquiredAt || undefined,
          expiresAt: lotCreateForm.expiresAt || undefined,
          replaceDays: asNumberOrUndef(lotCreateForm.replaceDays),
          batchRef: lotCreateForm.batchRef.trim() || undefined,
          notes: lotCreateForm.notes.trim() || undefined,
        }),
      });
      setLotCreateForm(EMPTY_LOT_FORM);
      setMessage("Lot added.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add lot.");
    } finally {
      setSaving(false);
    }
  }, [householdId, selectedItemId, lotCreateForm, loadData, setError]);

  const saveLotEdit = useCallback(async () => {
    if (!householdId || !selectedItemId || !editingLotId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const qty = asNumberOrUndef(lotEditForm.qty);
      await apiFetch(`/inventory/${householdId}/items/${selectedItemId}/lots/${editingLotId}`, {
        method: "PATCH",
        body: JSON.stringify({
          qty,
          acquiredAt: lotEditForm.acquiredAt || undefined,
          expiresAt: lotEditForm.expiresAt || undefined,
          replaceDays: asNumberOrUndef(lotEditForm.replaceDays),
          batchRef: lotEditForm.batchRef.trim() || undefined,
          notes: lotEditForm.notes.trim() || undefined,
        }),
      });
      setEditingLotId(null);
      setMessage("Lot updated.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update lot.");
    } finally {
      setSaving(false);
    }
  }, [householdId, selectedItemId, editingLotId, lotEditForm, loadData, setError]);

  const archiveLot = useCallback(
    async (lotId: string) => {
      if (!householdId || !selectedItemId) return;
      if (!window.confirm("Archive this lot?")) return;

      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        await apiFetch(`/inventory/${householdId}/items/${selectedItemId}/lots/${lotId}`, {
          method: "DELETE",
        });
        setMessage("Lot archived.");
        await loadData(householdId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to archive lot.");
      } finally {
        setSaving(false);
      }
    },
    [householdId, selectedItemId, loadData, setError]
  );

  return {
    saving,
    message,
    lotCreateForm,
    setLotCreateForm,
    editingLotId,
    lotEditForm,
    setLotEditForm,
    startLotEdit,
    cancelLotEdit,
    resetLotPanel,
    addLot,
    saveLotEdit,
    archiveLot,
  };
}
