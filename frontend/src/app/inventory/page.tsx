"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, fmtDate, daysUntil } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

type InventoryLot = {
  id: string;
  itemId: string;
  qty: number | string;
  acquiredAt?: string;
  expiresAt?: string;
  nextReplaceAt?: string;
  replaceDays?: number | null;
  batchRef?: string;
  notes?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  unit?: string;
  location?: string;
  categoryId?: string;
  targetQty?: number | string;
  lowStockThreshold?: number | string;
  isTrackedByExpiry: boolean;
  notes?: string;
  lots: InventoryLot[];
};

type InventoryCategory = {
  id: string;
  householdId?: string | null;
  isSystem: boolean;
  name: string;
  slug: string;
  sortOrder: number;
};

type ItemForm = {
  name: string;
  unit: string;
  location: string;
  categoryId: string;
  targetQty: string;
  lowStockThreshold: string;
  isTrackedByExpiry: boolean;
  initialLotQty: string;
  initialAcquiredAt: string;
  initialExpiresAt: string;
  notes: string;
};

type LotForm = {
  qty: string;
  acquiredAt: string;
  expiresAt: string;
  replaceDays: string;
  batchRef: string;
  notes: string;
};

type CategoryForm = {
  name: string;
  slug: string;
  sortOrder: string;
};

const EMPTY_ITEM_FORM: ItemForm = {
  name: "",
  unit: "",
  location: "",
  categoryId: "",
  targetQty: "",
  lowStockThreshold: "",
  isTrackedByExpiry: true,
  initialLotQty: "",
  initialAcquiredAt: "",
  initialExpiresAt: "",
  notes: "",
};

const EMPTY_LOT_FORM: LotForm = {
  qty: "",
  acquiredAt: "",
  expiresAt: "",
  replaceDays: "",
  batchRef: "",
  notes: "",
};

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: "",
  slug: "",
  sortOrder: "100",
};

function asNumberOrUndef(raw: string): number | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function itemToForm(item: InventoryItem): ItemForm {
  return {
    name: item.name,
    unit: item.unit ?? "",
    location: item.location ?? "",
    categoryId: item.categoryId ?? "",
    targetQty: item.targetQty != null ? String(item.targetQty) : "",
    lowStockThreshold: item.lowStockThreshold != null ? String(item.lowStockThreshold) : "",
    isTrackedByExpiry: item.isTrackedByExpiry,
    initialLotQty: "",
    initialAcquiredAt: "",
    initialExpiresAt: "",
    notes: item.notes ?? "",
  };
}

function lotToForm(lot: InventoryLot): LotForm {
  return {
    qty: String(lot.qty ?? ""),
    acquiredAt: lot.acquiredAt ? lot.acquiredAt.slice(0, 10) : "",
    expiresAt: lot.expiresAt ? lot.expiresAt.slice(0, 10) : "",
    replaceDays: lot.replaceDays != null ? String(lot.replaceDays) : "",
    batchRef: lot.batchRef ?? "",
    notes: lot.notes ?? "",
  };
}

export default function InventoryPage() {
  const { householdId, status } = useActiveHouseholdId();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<ItemForm>(EMPTY_ITEM_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_ITEM_FORM);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lotCreateForm, setLotCreateForm] = useState<LotForm>(EMPTY_LOT_FORM);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [lotEditForm, setLotEditForm] = useState<LotForm>(EMPTY_LOT_FORM);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [archiveCategoryId, setArchiveCategoryId] = useState<string | null>(null);
  const [archiveReplacementCategoryId, setArchiveReplacementCategoryId] = useState<string>("");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const archiveTargetCategory = useMemo(
    () => categories.find((c) => c.id === archiveCategoryId) ?? null,
    [categories, archiveCategoryId]
  );
  const archiveInUseCount = useMemo(
    () => (archiveCategoryId ? items.filter((item) => item.categoryId === archiveCategoryId).length : 0),
    [items, archiveCategoryId]
  );
  const archiveCategoryCandidates = useMemo(
    () => categories.filter((c) => c.id !== archiveCategoryId),
    [categories, archiveCategoryId]
  );

  async function loadData(id: string) {
    setLoading(true);
    try {
      const [itemRows, categoryRows] = await Promise.all([
        apiFetch<InventoryItem[]>(`/inventory/${id}/items`),
        apiFetch<InventoryCategory[]>(`/inventory/${id}/categories`),
      ]);
      setItems(itemRows);
      setCategories(categoryRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!householdId) return;
    void loadData(householdId);
  }, [householdId]);

  if (status === "loading") return <p className="text-muted-foreground text-sm">Loading session...</p>;
  if (!householdId) return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading inventory...</p>;

  async function createItem() {
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
  }

  async function saveItemEdit() {
    if (!householdId) return;
    if (!editingId) return;
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
  }

  async function archiveItem(itemId: string) {
    if (!householdId) return;
    if (!window.confirm("Archive this inventory item?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/inventory/${householdId}/items/${itemId}`, { method: "DELETE" });
      if (selectedItemId === itemId) setSelectedItemId(null);
      setMessage("Inventory item archived.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive inventory item.");
    } finally {
      setSaving(false);
    }
  }

  async function addLot() {
    if (!householdId) return;
    if (!selectedItemId) return;
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
      await apiFetch(`/inventory/${householdId}/categories`, {
        method: "POST",
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          slug: categoryForm.slug.trim(),
          sortOrder: asNumberOrUndef(categoryForm.sortOrder),
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
    if (!householdId || !editingCategoryId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/inventory/${householdId}/categories/${editingCategoryId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editCategoryForm.name.trim(),
          slug: editCategoryForm.slug.trim(),
          sortOrder: asNumberOrUndef(editCategoryForm.sortOrder),
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
    const inUseCount = items.filter((item) => item.categoryId === id).length;
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
        ? `/inventory/${householdId}/categories/${id}?replacementCategoryId=${encodeURIComponent(replacementCategoryId)}`
        : `/inventory/${householdId}/categories/${id}`;
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

  async function saveLotEdit() {
    if (!householdId) return;
    if (!selectedItemId || !editingLotId) return;
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
  }

  async function archiveLot(lotId: string) {
    if (!householdId) return;
    if (!selectedItemId) return;
    if (!window.confirm("Archive this lot?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/inventory/${householdId}/items/${selectedItemId}/lots/${lotId}`, { method: "DELETE" });
      setMessage("Lot archived.");
      await loadData(householdId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive lot.");
    } finally {
      setSaving(false);
    }
  }

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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add Inventory Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Item Name *</label>
            <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="Water bottle" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Unit</label>
            <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="L, kg, each" value={createForm.unit} onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Storage Location</label>
            <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="Basement shelf A" value={createForm.location} onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Item Category</label>
            <select className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={createForm.categoryId} onChange={(e) => setCreateForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Optional</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Target Quantity</label>
            <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="100" value={createForm.targetQty} onChange={(e) => setCreateForm((f) => ({ ...f, targetQty: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Low-Stock Threshold</label>
            <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="20" value={createForm.lowStockThreshold} onChange={(e) => setCreateForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Expiry Tracking</label>
            <label className="rounded-md border border-border bg-muted px-3 py-2 text-sm flex items-center gap-2">
              <input type="checkbox" checked={createForm.isTrackedByExpiry} onChange={(e) => setCreateForm((f) => ({ ...f, isTrackedByExpiry: e.target.checked }))} />
              Track by expiry
            </label>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Initial Lot Quantity</label>
            <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="Optional" value={createForm.initialLotQty} onChange={(e) => setCreateForm((f) => ({ ...f, initialLotQty: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Initial Acquired Date</label>
            <input type="date" className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={createForm.initialAcquiredAt} onChange={(e) => setCreateForm((f) => ({ ...f, initialAcquiredAt: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">Initial Expiry Date</label>
            <input type="date" className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={createForm.initialExpiresAt} onChange={(e) => setCreateForm((f) => ({ ...f, initialExpiresAt: e.target.value }))} />
          </div>
          <button type="button" onClick={createItem} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
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
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expiry / Replace</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const totalQty = item.lots.reduce((s, l) => s + Number(l.qty), 0);
              const threshold = Number(item.lowStockThreshold ?? item.targetQty ?? 0);
              const belowTarget = (item.lowStockThreshold != null || item.targetQty != null) && totalQty < threshold;
              const earliestExpiry = item.lots.map((l) => l.expiresAt).filter(Boolean).sort()[0];
              const earliestReplace = item.lots.map((l) => l.nextReplaceAt).filter(Boolean).sort()[0];
              const dueDays = daysUntil(earliestExpiry ?? earliestReplace);

              return (
                <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {belowTarget && <AlertTriangle size={13} className="text-yellow-400 shrink-0" />}
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground text-xs">({item.unit || "each"})</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.location ?? "-"}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{totalQty}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{item.targetQty ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {dueDays == null ? <span className="text-muted-foreground">-</span> : dueDays < 0 ? <span className="text-destructive font-medium">Overdue</span> : <span className={dueDays <= 30 ? "text-yellow-400" : "text-muted-foreground"}>{earliestExpiry ? fmtDate(earliestExpiry) : fmtDate(earliestReplace)}{dueDays <= 30 ? ` (${dueDays}d)` : ""}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" onClick={() => { setEditingId(item.id); setEditForm(itemToForm(item)); }} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Pencil size={12} /> Edit</button>
                      <button type="button" onClick={() => setSelectedItemId(item.id)} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Lots</button>
                      <button type="button" onClick={() => archiveItem(item.id)} className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 inline-flex items-center gap-1"><Trash2 size={12} /> Archive</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingId && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Edit Inventory Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Item Name *</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Unit</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Storage Location</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Item Category</label>
              <select className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={editForm.categoryId} onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Optional</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Target Quantity</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={editForm.targetQty} onChange={(e) => setEditForm((f) => ({ ...f, targetQty: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Low-Stock Threshold</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={editForm.lowStockThreshold} onChange={(e) => setEditForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Expiry Tracking</label>
              <label className="rounded-md border border-border bg-muted px-3 py-2 text-sm flex items-center gap-2"><input type="checkbox" checked={editForm.isTrackedByExpiry} onChange={(e) => setEditForm((f) => ({ ...f, isTrackedByExpiry: e.target.checked }))} /> Track by expiry</label>
            </div>
            <div className="flex gap-2"><button type="button" onClick={saveItemEdit} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button><button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Cancel</button></div>
          </div>
        </section>
      )}

      {selectedItem && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lot Management: {selectedItem.name}</h2>
            <button type="button" onClick={() => { setSelectedItemId(null); setEditingLotId(null); }} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Lot Quantity *</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="10" value={lotCreateForm.qty} onChange={(e) => setLotCreateForm((f) => ({ ...f, qty: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Lot Acquired Date</label>
              <input type="date" className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotCreateForm.acquiredAt} onChange={(e) => setLotCreateForm((f) => ({ ...f, acquiredAt: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Lot Expiry Date</label>
              <input type="date" className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotCreateForm.expiresAt} onChange={(e) => setLotCreateForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Replace Interval (days)</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="30" value={lotCreateForm.replaceDays} onChange={(e) => setLotCreateForm((f) => ({ ...f, replaceDays: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-primary">Batch Reference</label>
              <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" placeholder="LOT-2026-03" value={lotCreateForm.batchRef} onChange={(e) => setLotCreateForm((f) => ({ ...f, batchRef: e.target.value }))} />
            </div>
            <button type="button" onClick={addLot} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center justify-center gap-2"><Plus size={14} /> Add Lot</button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Acquired</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expires</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Replace Days</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Batch Ref</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedItem.lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">{lot.qty}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(lot.acquiredAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(lot.expiresAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{lot.replaceDays ?? "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{lot.batchRef ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right"><div className="inline-flex gap-2"><button type="button" onClick={() => { setEditingLotId(lot.id); setLotEditForm(lotToForm(lot)); }} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Pencil size={12} /> Edit</button><button type="button" onClick={() => archiveLot(lot.id)} className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 inline-flex items-center gap-1"><Trash2 size={12} /> Archive</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingLotId && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-primary">Lot Quantity *</label>
                <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotEditForm.qty} onChange={(e) => setLotEditForm((f) => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-primary">Lot Acquired Date</label>
                <input type="date" className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotEditForm.acquiredAt} onChange={(e) => setLotEditForm((f) => ({ ...f, acquiredAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-primary">Lot Expiry Date</label>
                <input type="date" className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotEditForm.expiresAt} onChange={(e) => setLotEditForm((f) => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-primary">Replace Interval (days)</label>
                <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotEditForm.replaceDays} onChange={(e) => setLotEditForm((f) => ({ ...f, replaceDays: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-primary">Batch Reference</label>
                <input className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" value={lotEditForm.batchRef} onChange={(e) => setLotEditForm((f) => ({ ...f, batchRef: e.target.value }))} />
              </div>
              <div className="flex gap-2"><button type="button" onClick={saveLotEdit} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button><button type="button" onClick={() => setEditingLotId(null)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Cancel</button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
