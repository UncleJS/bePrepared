"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SortableHeader,
  nextSort,
  sortHelpers,
  type SortState,
} from "@/components/ui/SortableHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormSheet } from "@/components/ui/FormSheet";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InventoryItemFormFields } from "@/app/inventory/InventoryItemFormFields";
import { InventoryItemRow } from "@/app/inventory/InventoryItemRow";
import { InventoryLotFormFields } from "@/app/inventory/InventoryLotFormFields";
import { InventoryLotRow } from "@/app/inventory/InventoryLotRow";
import type { InventoryItem } from "@/app/inventory/types";
import { useInventoryData } from "@/app/inventory/useInventoryData";
import { useInventoryItemActions } from "@/app/inventory/useInventoryItemActions";
import { useInventoryLotActions } from "@/app/inventory/useInventoryLotActions";

type ActiveAlert = {
  entityType: string;
  entityId: string;
  isResolved: boolean;
};

type InvSortKey = "name" | "location" | "qty" | "targetQty" | "expiry";

export function InventoryPanel() {
  const { householdId, status } = useActiveHouseholdId();
  const { items, categories, loading, error, setError, loadData } = useInventoryData();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [alertItemIds, setAlertItemIds] = useState<Set<string>>(new Set());
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [createLotOpen, setCreateLotOpen] = useState(false);
  const [editLotOpen, setEditLotOpen] = useState(false);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);
  const [archiveLotId, setArchiveLotId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<InvSortKey>>({ key: null, dir: "asc" });

  function handleSort(key: InvSortKey) {
    setSort((prev) => nextSort(prev, key));
  }

  const itemActions = useInventoryItemActions({
    householdId,
    loadData,
    setError,
    onArchivedItem: (itemId) => {
      setSelectedItemId((prev) => (prev === itemId ? null : prev));
      setEditItemOpen(false);
    },
  });

  const lotActions = useInventoryLotActions({
    householdId,
    selectedItemId,
    loadData,
    setError,
  });

  const message = itemActions.message ?? lotActions.message;

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const sortedItems = useMemo(() => {
    if (!sort.key) return items;
    const { key, dir } = sort;
    return [...items].sort((a, b) => {
      switch (key) {
        case "name":
          return sortHelpers.cmpStr(a.name, b.name, dir);
        case "location":
          return sortHelpers.cmpStr(a.location ?? "", b.location ?? "", dir);
        case "qty": {
          const qtyA = a.lots.reduce((s, l) => s + Number(l.qty), 0);
          const qtyB = b.lots.reduce((s, l) => s + Number(l.qty), 0);
          return sortHelpers.cmpNum(qtyA, qtyB, dir);
        }
        case "targetQty":
          return sortHelpers.cmpNum(Number(a.targetQty ?? 0), Number(b.targetQty ?? 0), dir);
        case "expiry": {
          const expiryA =
            [...a.lots.map((l) => l.expiresAt), ...a.lots.map((l) => l.nextReplaceAt)]
              .filter(Boolean)
              .sort()[0] ?? "";
          const expiryB =
            [...b.lots.map((l) => l.expiresAt), ...b.lots.map((l) => l.nextReplaceAt)]
              .filter(Boolean)
              .sort()[0] ?? "";
          return sortHelpers.cmpStr(expiryA, expiryB, dir);
        }
        default:
          return 0;
      }
    });
  }, [items, sort]);

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId, loadData]);

  useEffect(() => {
    if (!householdId || items.length === 0) return;

    void apiFetch<ActiveAlert[]>(`/alerts/${householdId}`)
      .then((allAlerts) => {
        const active = allAlerts.filter((a) => !a.isResolved);
        const lotToItem = new Map<string, string>();
        for (const item of items) {
          for (const lot of item.lots) {
            lotToItem.set(lot.id, item.id);
          }
        }

        const ids = new Set<string>();
        for (const a of active) {
          if (a.entityType === "inventory_lot") {
            const itemId = lotToItem.get(a.entityId);
            if (itemId) ids.add(itemId);
          }
        }
        setAlertItemIds(ids);
      })
      .catch(() => setAlertItemIds(new Set()));
  }, [householdId, items]);

  useEffect(() => {
    if (!itemActions.editingId) setEditItemOpen(false);
  }, [itemActions.editingId]);

  useEffect(() => {
    if (itemActions.message === "Inventory item added.") setCreateItemOpen(false);
  }, [itemActions.message]);

  useEffect(() => {
    if (!lotActions.editingLotId) setEditLotOpen(false);
  }, [lotActions.editingLotId]);

  useEffect(() => {
    if (lotActions.message === "Lot added.") setCreateLotOpen(false);
  }, [lotActions.message]);

  if (status === "loading") return <LoadingSpinner label="Loading session…" />;
  if (!householdId)
    return (
      <EmptyState
        title="No household in session"
        description="Select a household to manage supplies."
      />
    );
  if (loading) return <LoadingSpinner label="Loading inventory…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} items tracked</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/inventory-categories"
            className="inline-flex rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Categories
          </Link>
          <button
            type="button"
            onClick={() => setCreateItemOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={14} /> Add item
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? (
        <ErrorBanner
          message={error}
          retry={householdId ? () => void loadData(householdId) : undefined}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          description="Start by adding your first tracked consumable or stock item."
          action={{ label: "Add inventory item", onClick: () => setCreateItemOpen(true) }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader
                  label="Item"
                  colKey="name"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <SortableHeader
                  label="Location"
                  colKey="location"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <SortableHeader
                  label="Qty"
                  colKey="qty"
                  sort={sort}
                  onSort={handleSort}
                  className="text-right px-4 py-2"
                />
                <SortableHeader
                  label="Target"
                  colKey="targetQty"
                  sort={sort}
                  onSort={handleSort}
                  className="text-right px-4 py-2"
                />
                <SortableHeader
                  label="Expiry / Replace"
                  colKey="expiry"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedItems.map((item) => (
                <InventoryItemRow
                  key={item.id}
                  item={item}
                  alertItemIds={alertItemIds}
                  onEdit={(row) => {
                    itemActions.startEdit(row);
                    setEditItemOpen(true);
                  }}
                  onOpenLots={setSelectedItemId}
                  onArchive={setArchiveItemId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Lot management — {selectedItem.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Track batches, expiry dates, and replacement cycles.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateLotOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus size={14} /> Add lot
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedItemId(null);
                  setCreateLotOpen(false);
                  setEditLotOpen(false);
                  lotActions.resetLotPanel();
                }}
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>

          {selectedItem.lots.length === 0 ? (
            <EmptyState
              title="No lots for this item"
              description="Add a lot to track acquired dates, expiry, and replacement timing."
              action={{ label: "Add lot", onClick: () => setCreateLotOpen(true) }}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Qty</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Acquired
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Expires
                    </th>
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
                      onEdit={(row) => {
                        lotActions.startLotEdit(row);
                        setEditLotOpen(true);
                      }}
                      onArchive={setArchiveLotId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <FormSheet
        open={createItemOpen}
        onOpenChange={setCreateItemOpen}
        title="Add inventory item"
        description="Create a tracked item and optionally seed its first lot."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InventoryItemFormFields
            form={itemActions.createForm}
            setForm={itemActions.setCreateForm}
            categories={categories}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCreateItemOpen(false)}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void itemActions.createItem()}
            disabled={itemActions.saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {itemActions.saving ? "Saving…" : "Add item"}
          </button>
        </div>
      </FormSheet>

      <FormSheet
        open={editItemOpen}
        onOpenChange={(open) => {
          setEditItemOpen(open);
          if (!open) itemActions.cancelEdit();
        }}
        title="Edit inventory item"
        description="Update target quantities, location, and lifecycle settings."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InventoryItemFormFields
            form={itemActions.editForm}
            setForm={itemActions.setEditForm}
            categories={categories}
            includeInitialLot={false}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditItemOpen(false);
              itemActions.cancelEdit();
            }}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void itemActions.saveItemEdit()}
            disabled={itemActions.saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {itemActions.saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </FormSheet>

      <FormSheet
        open={createLotOpen}
        onOpenChange={setCreateLotOpen}
        title="Add lot"
        description={selectedItem ? `Create a new lot for ${selectedItem.name}.` : undefined}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InventoryLotFormFields
            form={lotActions.lotCreateForm}
            setForm={lotActions.setLotCreateForm}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCreateLotOpen(false)}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void lotActions.addLot()}
            disabled={lotActions.saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {lotActions.saving ? "Saving…" : "Add lot"}
          </button>
        </div>
      </FormSheet>

      <FormSheet
        open={editLotOpen}
        onOpenChange={(open) => {
          setEditLotOpen(open);
          if (!open) lotActions.cancelLotEdit();
        }}
        title="Edit lot"
        description="Update quantity, dates, and batch details."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InventoryLotFormFields
            form={lotActions.lotEditForm}
            setForm={lotActions.setLotEditForm}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditLotOpen(false);
              lotActions.cancelLotEdit();
            }}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void lotActions.saveLotEdit()}
            disabled={lotActions.saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {lotActions.saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </FormSheet>

      <ConfirmDialog
        open={archiveItemId !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveItemId(null);
        }}
        title="Archive inventory item?"
        description="This keeps the record archived instead of deleting it permanently."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiveItemId) void itemActions.archiveItem(archiveItemId);
          setArchiveItemId(null);
        }}
      />

      <ConfirmDialog
        open={archiveLotId !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveLotId(null);
        }}
        title="Archive lot?"
        description="The lot will be archived and removed from active supply tracking."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiveLotId) void lotActions.archiveLot(archiveLotId);
          setArchiveLotId(null);
        }}
      />
    </div>
  );
}
