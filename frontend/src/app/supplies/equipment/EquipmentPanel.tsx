"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Plus } from "lucide-react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormSheet } from "@/components/ui/FormSheet";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  SortableHeader,
  nextSort,
  sortHelpers,
  type SortState,
} from "@/components/ui/SortableHeader";
import { EquipmentFormFields } from "@/app/equipment/EquipmentFormFields";
import { EquipmentRow } from "@/app/equipment/EquipmentRow";
import type { Equipment } from "@/app/equipment/types";
import { useEquipmentData } from "@/app/equipment/useEquipmentData";
import { useEquipmentItemActions } from "@/app/equipment/useEquipmentItemActions";

type EqSortKey = "name" | "category" | "modelSerial" | "location" | "status" | "acquiredAt";

const STATUS_RANK: Record<string, number> = {
  operational: 0,
  needs_service: 1,
  unserviceable: 2,
  retired: 3,
};

export function EquipmentPanel() {
  const { householdId, status } = useActiveHouseholdId();
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);
  const [restoreItemId, setRestoreItemId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<EqSortKey>>({ key: null, dir: "asc" });

  function handleSort(key: EqSortKey) {
    setSort((prev) => nextSort(prev, key));
  }

  const {
    equipment,
    archivedEquipment,
    categories,
    loading,
    error,
    setError,
    loadData,
    loadArchived,
  } = useEquipmentData();

  const actions = useEquipmentItemActions({
    householdId,
    loadData,
    loadArchived,
    showArchived,
    setError,
  });

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const sortEquipment = useMemo(() => {
    return (list: Equipment[]): Equipment[] => {
      if (!sort.key) return list;
      const { key, dir } = sort;
      return [...list].sort((a, b) => {
        switch (key) {
          case "name":
            return sortHelpers.cmpStr(a.name, b.name, dir);
          case "category":
            return sortHelpers.cmpStr(
              categoryMap[a.categoryId ?? ""] ?? "",
              categoryMap[b.categoryId ?? ""] ?? "",
              dir
            );
          case "modelSerial":
            return sortHelpers.cmpStr(
              [a.model, a.serialNo].filter(Boolean).join(" "),
              [b.model, b.serialNo].filter(Boolean).join(" "),
              dir
            );
          case "location":
            return sortHelpers.cmpStr(a.location ?? "", b.location ?? "", dir);
          case "status": {
            const ra = STATUS_RANK[a.status] ?? 99;
            const rb = STATUS_RANK[b.status] ?? 99;
            return sortHelpers.cmpNum(ra, rb, dir);
          }
          case "acquiredAt":
            return sortHelpers.cmpStr(a.acquiredAt ?? "", b.acquiredAt ?? "", dir);
          default:
            return 0;
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, categoryMap]);

  const sortedEquipment = useMemo(() => sortEquipment(equipment), [sortEquipment, equipment]);
  const sortedArchivedEquipment = useMemo(
    () => sortEquipment(archivedEquipment),
    [sortEquipment, archivedEquipment]
  );

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId, loadData]);

  useEffect(() => {
    if (!householdId || !showArchived) return;
    void loadArchived(householdId);
  }, [showArchived, householdId, loadArchived]);

  useEffect(() => {
    if (!actions.editingId) setEditOpen(false);
  }, [actions.editingId]);

  useEffect(() => {
    if (actions.message === "Equipment item added.") setCreateOpen(false);
  }, [actions.message]);

  if (status === "loading") return <LoadingSpinner label="Loading session…" />;
  if (!householdId)
    return (
      <EmptyState
        title="No household in session"
        description="Select a household to manage equipment."
      />
    );
  if (loading) return <LoadingSpinner label="Loading equipment…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Equipment</h2>
          <p className="mt-1 text-sm text-muted-foreground">{equipment.length} items registered</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/equipment-categories"
            className="inline-flex rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Categories
          </Link>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              showArchived
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Archive size={14} />
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={14} /> Add item
          </button>
        </div>
      </div>

      {actions.message ? <p className="text-sm text-emerald-400">{actions.message}</p> : null}
      {error ? (
        <ErrorBanner
          message={error}
          retry={householdId ? () => void loadData(householdId) : undefined}
        />
      ) : null}

      {equipment.length === 0 ? (
        <EmptyState
          title="No equipment yet"
          description="Track operational status, location, and service history for your gear."
          action={{ label: "Add equipment item", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader
                  label="Name"
                  colKey="name"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <SortableHeader
                  label="Category"
                  colKey="category"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <SortableHeader
                  label="Model / Serial"
                  colKey="modelSerial"
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
                  label="Status"
                  colKey="status"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <SortableHeader
                  label="Acquired"
                  colKey="acquiredAt"
                  sort={sort}
                  onSort={handleSort}
                  className="text-left px-4 py-2"
                />
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedEquipment.map((item) => (
                <EquipmentRow
                  key={item.id}
                  item={item}
                  categoryMap={categoryMap}
                  onEdit={(row) => {
                    actions.startEdit(row);
                    setEditOpen(true);
                  }}
                  onArchive={setArchiveItemId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showArchived ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
            <Archive size={13} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Archived ({archivedEquipment.length})
            </span>
          </div>
          {archivedEquipment.length === 0 ? (
            <EmptyState
              title="No archived equipment"
              description="Archived items will appear here for restore actions."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <SortableHeader
                    label="Name"
                    colKey="name"
                    sort={sort}
                    onSort={handleSort}
                    className="text-left px-4 py-2"
                  />
                  <SortableHeader
                    label="Category"
                    colKey="category"
                    sort={sort}
                    onSort={handleSort}
                    className="text-left px-4 py-2"
                  />
                  <SortableHeader
                    label="Model / Serial"
                    colKey="modelSerial"
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
                    label="Status"
                    colKey="status"
                    sort={sort}
                    onSort={handleSort}
                    className="text-left px-4 py-2"
                  />
                  <SortableHeader
                    label="Acquired"
                    colKey="acquiredAt"
                    sort={sort}
                    onSort={handleSort}
                    className="text-left px-4 py-2"
                  />
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedArchivedEquipment.map((item) => (
                  <EquipmentRow
                    key={item.id}
                    item={item}
                    categoryMap={categoryMap}
                    onEdit={actions.startEdit}
                    onArchive={setArchiveItemId}
                    onRestore={setRestoreItemId}
                    isArchived
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      <FormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add equipment item"
        description="Register service status, category, location, and serial details."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EquipmentFormFields
            form={actions.createForm}
            setForm={actions.setCreateForm}
            categories={categories}
          />
        </div>
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
            onClick={() => void actions.createItem()}
            disabled={actions.saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {actions.saving ? "Saving…" : "Add item"}
          </button>
        </div>
      </FormSheet>

      <FormSheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) actions.cancelEdit();
        }}
        title="Edit equipment item"
        description="Update category, service state, storage location, and notes."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EquipmentFormFields
            form={actions.editForm}
            setForm={actions.setEditForm}
            categories={categories}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditOpen(false);
              actions.cancelEdit();
            }}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void actions.saveItemEdit()}
            disabled={actions.saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {actions.saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </FormSheet>

      <ConfirmDialog
        open={archiveItemId !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveItemId(null);
        }}
        title="Archive equipment item?"
        description="This hides the item from active equipment lists but keeps a restore path."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiveItemId) void actions.archiveItem(archiveItemId);
          setArchiveItemId(null);
        }}
      />

      <ConfirmDialog
        open={restoreItemId !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreItemId(null);
        }}
        title="Restore equipment item?"
        description="This returns the archived item to the active equipment list."
        confirmLabel="Restore"
        onConfirm={() => {
          if (restoreItemId) void actions.restoreItem(restoreItemId);
          setRestoreItemId(null);
        }}
      />
    </div>
  );
}
