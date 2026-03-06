"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Plus, Archive } from "lucide-react";
import Link from "next/link";
import { EquipmentRow } from "./EquipmentRow";
import { EquipmentFormFields } from "./EquipmentFormFields";
import { useEquipmentData } from "./useEquipmentData";
import { useEquipmentItemActions } from "./useEquipmentItemActions";

export default function EquipmentPage() {
  const { householdId, status } = useActiveHouseholdId();
  const [showArchived, setShowArchived] = useState(false);

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

  const {
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
  } = useEquipmentItemActions({ householdId, loadData, loadArchived, showArchived, setError });

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId, loadData]);

  useEffect(() => {
    if (!householdId) return;
    if (showArchived) {
      void loadArchived(householdId);
    }
  }, [showArchived, householdId, loadArchived]);

  if (status === "loading")
    return <p className="text-muted-foreground text-sm">Loading session...</p>;
  if (!householdId)
    return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading equipment...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment</h1>
          <p className="text-muted-foreground text-sm mt-1">{equipment.length} items registered</p>
        </div>
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            showArchived
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Archive size={13} />
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Category management moved to settings.
          <Link href="/settings/equipment-categories" className="ml-2 text-primary hover:underline">
            Open Equipment Categories
          </Link>
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Add Equipment Item
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <EquipmentFormFields form={createForm} setForm={setCreateForm} categories={categories} />
          <button
            type="button"
            onClick={createItem}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center justify-center gap-2"
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
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Category</th>
              <th className="text-left px-4 py-2">Model / Serial</th>
              <th className="text-left px-4 py-2">Location</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Acquired</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipment.map((item) => (
              <EquipmentRow
                key={item.id}
                item={item}
                categoryMap={categoryMap}
                onEdit={startEdit}
                onArchive={archiveItem}
              />
            ))}
            {equipment.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No equipment registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showArchived && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
            <Archive size={13} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Archived ({archivedEquipment.length})
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Model / Serial</th>
                <th className="text-left px-4 py-2">Location</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Acquired</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {archivedEquipment.map((item) => (
                <EquipmentRow
                  key={item.id}
                  item={item}
                  categoryMap={categoryMap}
                  onEdit={startEdit}
                  onArchive={archiveItem}
                  onRestore={restoreItem}
                  isArchived
                />
              ))}
              {archivedEquipment.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No archived equipment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Edit Equipment Item
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <EquipmentFormFields form={editForm} setForm={setEditForm} categories={categories} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveItemEdit}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Save
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
