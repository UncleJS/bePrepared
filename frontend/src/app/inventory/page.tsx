"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Plus } from "lucide-react";
import Link from "next/link";
import { InventoryItemFormFields } from "./InventoryItemFormFields";
import { InventoryItemRow } from "./InventoryItemRow";
import { InventoryLotFormFields } from "./InventoryLotFormFields";
import { InventoryLotRow } from "./InventoryLotRow";
import type { InventoryItem } from "./types";
import { useInventoryData } from "./useInventoryData";
import { useInventoryItemActions } from "./useInventoryItemActions";
import { useInventoryLotActions } from "./useInventoryLotActions";

export default function InventoryPage() {
  const { householdId, status } = useActiveHouseholdId();

  const { items, categories, loading, error, setError, loadData } = useInventoryData();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const itemActions = useInventoryItemActions({
    householdId,
    loadData,
    setError,
    onArchivedItem: (itemId) => {
      setSelectedItemId((prev) => (prev === itemId ? null : prev));
    },
  });
  const lotActions = useInventoryLotActions({
    householdId,
    selectedItemId,
    loadData,
    setError,
  });
  const saving = itemActions.saving || lotActions.saving;
  const message = itemActions.message ?? lotActions.message;

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId, loadData]);

  if (status === "loading")
    return <p className="text-muted-foreground text-sm">Loading session...</p>;
  if (!householdId)
    return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading inventory...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">{items.length} items tracked</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Category management moved to settings.
          <Link href="/settings/inventory-categories" className="ml-2 text-primary hover:underline">
            Open Inventory Categories
          </Link>
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Add Inventory Item
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InventoryItemFormFields
            form={itemActions.createForm}
            setForm={itemActions.setCreateForm}
            categories={categories}
          />
          <button
            type="button"
            onClick={itemActions.createItem}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      </section>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Item</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Location</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Target</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                Expiry / Replace
              </th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <InventoryItemRow
                key={item.id}
                item={item}
                onEdit={itemActions.startEdit}
                onOpenLots={setSelectedItemId}
                onArchive={itemActions.archiveItem}
              />
            ))}
          </tbody>
        </table>
      </div>

      {itemActions.editingId && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Edit Inventory Item
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <InventoryItemFormFields
              form={itemActions.editForm}
              setForm={itemActions.setEditForm}
              categories={categories}
              includeInitialLot={false}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={itemActions.saveItemEdit}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Save
              </button>
              <button
                type="button"
                onClick={itemActions.cancelEdit}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {selectedItem && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lot Management: {selectedItem.name}
            </h2>
            <button
              type="button"
              onClick={() => {
                setSelectedItemId(null);
                lotActions.resetLotPanel();
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <InventoryLotFormFields
              form={lotActions.lotCreateForm}
              setForm={lotActions.setLotCreateForm}
            />
            <button
              type="button"
              onClick={lotActions.addLot}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Add Lot
            </button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Acquired
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expires</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Replace Days
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Batch Ref
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedItem.lots.map((lot) => (
                  <InventoryLotRow
                    key={lot.id}
                    lot={lot}
                    onEdit={lotActions.startLotEdit}
                    onArchive={lotActions.archiveLot}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {lotActions.editingLotId && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <InventoryLotFormFields
                form={lotActions.lotEditForm}
                setForm={lotActions.setLotEditForm}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={lotActions.saveLotEdit}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={lotActions.cancelLotEdit}
                  className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
