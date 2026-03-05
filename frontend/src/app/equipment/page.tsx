"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, fmtDate } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

type EquipmentCategory = {
  id: string;
  householdId?: string | null;
  isSystem: boolean;
  name: string;
  slug: string;
  sortOrder: number;
};

type Equipment = {
  id: string;
  name: string;
  model?: string;
  serialNo?: string;
  categoryId?: string | null;
  categorySlug: string;
  status: "operational" | "needs_service" | "unserviceable" | "retired";
  location?: string;
  acquiredAt?: string;
  notes?: string;
};

type EquipmentForm = {
  name: string;
  categoryId: string;
  model: string;
  serialNo: string;
  location: string;
  status: "operational" | "needs_service" | "unserviceable" | "retired";
  acquiredAt: string;
  notes: string;
};

type CategoryForm = {
  name: string;
  slug: string;
  sortOrder: string;
};

const STATUS_COLORS: Record<string, string> = {
  operational: "text-primary",
  needs_service: "text-yellow-400",
  unserviceable: "text-destructive",
  retired: "text-muted-foreground",
};

const EMPTY_EQUIPMENT_FORM: EquipmentForm = {
  name: "",
  categoryId: "",
  model: "",
  serialNo: "",
  location: "",
  status: "operational",
  acquiredAt: "",
  notes: "",
};

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: "",
  slug: "",
  sortOrder: "100",
};

function asNum(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

function toForm(item: Equipment): EquipmentForm {
  return {
    name: item.name,
    categoryId: item.categoryId ?? "",
    model: item.model ?? "",
    serialNo: item.serialNo ?? "",
    location: item.location ?? "",
    status: item.status,
    acquiredAt: item.acquiredAt ? item.acquiredAt.slice(0, 10) : "",
    notes: item.notes ?? "",
  };
}

export default function EquipmentPage() {
  const { householdId, status } = useActiveHouseholdId();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<EquipmentForm>(EMPTY_EQUIPMENT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EquipmentForm>(EMPTY_EQUIPMENT_FORM);

  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [archiveCategoryId, setArchiveCategoryId] = useState<string | null>(null);
  const [archiveReplacementCategoryId, setArchiveReplacementCategoryId] = useState<string>("");

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );
  const archiveTargetCategory = useMemo(
    () => categories.find((c) => c.id === archiveCategoryId) ?? null,
    [categories, archiveCategoryId]
  );
  const archiveInUseCount = useMemo(
    () =>
      archiveCategoryId
        ? equipment.filter((item) => item.categoryId === archiveCategoryId).length
        : 0,
    [equipment, archiveCategoryId]
  );
  const archiveCategoryCandidates = useMemo(
    () => categories.filter((c) => c.id !== archiveCategoryId),
    [categories, archiveCategoryId]
  );

  async function loadData(id: string) {
    setLoading(true);
    try {
      const [items, cats] = await Promise.all([
        apiFetch<Equipment[]>(`/equipment/${id}`),
        apiFetch<EquipmentCategory[]>(`/equipment/${id}/categories`),
      ]);
      setEquipment(items);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load equipment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId]);

  if (status === "loading")
    return <p className="text-muted-foreground text-sm">Loading session...</p>;
  if (!householdId)
    return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading equipment...</p>;

  async function createItem() {
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
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add equipment item.");
    } finally {
      setSaving(false);
    }
  }

  async function saveItemEdit() {
    if (!householdId) return;
    if (!editingId) return;
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
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update equipment item.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(id: string) {
    if (!householdId) return;
    if (!window.confirm("Archive this equipment item?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/equipment/${householdId}/${id}`, { method: "DELETE" });
      setMessage("Equipment item archived.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive equipment item.");
    } finally {
      setSaving(false);
    }
  }

  async function createCategory() {
    if (!householdId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
        setError("Category name and slug are required.");
        return;
      }
      await apiFetch(`/equipment/${householdId}/categories`, {
        method: "POST",
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          slug: categoryForm.slug.trim(),
          sortOrder: asNum(categoryForm.sortOrder),
        }),
      });
      setCategoryForm(EMPTY_CATEGORY_FORM);
      setMessage("Category added.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCategoryEdit() {
    if (!householdId) return;
    if (!editingCategoryId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/equipment/${householdId}/categories/${editingCategoryId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editCategoryForm.name.trim(),
          slug: editCategoryForm.slug.trim(),
          sortOrder: asNum(editCategoryForm.sortOrder),
        }),
      });
      setEditingCategoryId(null);
      setMessage("Category updated.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update category.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveCategory(id: string) {
    if (!householdId) return;
    const inUseCount = equipment.filter((item) => item.categoryId === id).length;
    if (inUseCount > 0) {
      if (!window.confirm("Category is in use. Reassign items before archiving?")) return;
      if (categories.filter((c) => c.id !== id).length === 0) {
        setError("Cannot archive category in use: no replacement categories available.");
        return;
      }
      setArchiveCategoryId(id);
      setArchiveReplacementCategoryId("");
      return;
    }

    if (!window.confirm("Archive this custom category?")) return;
    await performArchiveCategory(id);
  }

  async function performArchiveCategory(id: string, replacementCategoryId?: string) {
    if (!householdId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const path = replacementCategoryId
        ? `/equipment/${householdId}/categories/${id}?replacementCategoryId=${encodeURIComponent(replacementCategoryId)}`
        : `/equipment/${householdId}/categories/${id}`;
      await apiFetch(path, { method: "DELETE" });
      setArchiveCategoryId(null);
      setArchiveReplacementCategoryId("");
      setMessage("Category archived.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive category.");
    } finally {
      setSaving(false);
    }
  }

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
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Equipment Name *
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="Generator"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Equipment Category
            </label>
            <select
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={createForm.categoryId}
              onChange={(e) => setCreateForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Model
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="EU2200i"
              value={createForm.model}
              onChange={(e) => setCreateForm((f) => ({ ...f, model: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Serial Number
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="SN-123456"
              value={createForm.serialNo}
              onChange={(e) => setCreateForm((f) => ({ ...f, serialNo: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Storage Location
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              placeholder="Garage"
              value={createForm.location}
              onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Operational Status
            </label>
            <select
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={createForm.status}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, status: e.target.value as EquipmentForm["status"] }))
              }
            >
              <option value="operational">Operational</option>
              <option value="needs_service">Needs service</option>
              <option value="unserviceable">Unserviceable</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Acquired Date
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={createForm.acquiredAt}
              onChange={(e) => setCreateForm((f) => ({ ...f, acquiredAt: e.target.value }))}
            />
          </div>
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
            {equipment.map((eq) => (
              <tr key={eq.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">{eq.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {(eq.categoryId && categoryMap[eq.categoryId]) || eq.categorySlug || "-"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {[eq.model, eq.serialNo].filter(Boolean).join(" / ") || "-"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{eq.location ?? "-"}</td>
                <td className="px-4 py-2.5">
                  <span className={`font-medium capitalize ${STATUS_COLORS[eq.status]}`}>
                    {eq.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(eq.acquiredAt)}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(eq.id);
                        setEditForm(toForm(eq));
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveItem(eq.id)}
                      className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Archive
                    </button>
                  </div>
                </td>
              </tr>
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
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Equipment Name *
              </label>
              <input
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Equipment Category
              </label>
              <select
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.categoryId}
                onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Model
              </label>
              <input
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.model}
                onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Serial Number
              </label>
              <input
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.serialNo}
                onChange={(e) => setEditForm((f) => ({ ...f, serialNo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Storage Location
              </label>
              <input
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Operational Status
              </label>
              <select
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, status: e.target.value as EquipmentForm["status"] }))
                }
              >
                <option value="operational">Operational</option>
                <option value="needs_service">Needs service</option>
                <option value="unserviceable">Unserviceable</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">
                Acquired Date
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                value={editForm.acquiredAt}
                onChange={(e) => setEditForm((f) => ({ ...f, acquiredAt: e.target.value }))}
              />
            </div>
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
                onClick={() => setEditingId(null)}
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
