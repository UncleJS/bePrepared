"use client";

import { useEffect, useMemo } from "react";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Plus } from "lucide-react";
import Link from "next/link";
import { EquipmentRow } from "./EquipmentRow";
import { EquipmentFormFields } from "./EquipmentFormFields";
import { useEquipmentData } from "./useEquipmentData";
import { useEquipmentItemActions } from "./useEquipmentItemActions";

export default function EquipmentPage() {
  const { householdId, status } = useActiveHouseholdId();

  const { equipment, categories, loading, error, setError, loadData } = useEquipmentData();
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
  } = useEquipmentItemActions({ householdId, loadData, setError });

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId, loadData]);

  if (status === "loading")
    return <p className="text-muted-foreground text-sm">Loading session...</p>;
  if (!householdId)
    return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading equipment...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-muted-foreground text-sm mt-1">{equipment.length} items registered</p>
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
          </tbody>
        </table>
      </div>

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
