"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Category = { id: string; name: string; slug: string; isSystem: boolean; sortOrder: number };
type Item = { id: string; categoryId?: string | null };

export function CategoryManager({
  title,
  categoryPath,
  itemPath,
  namePlaceholder,
  slugPlaceholder,
}: {
  title: string;
  categoryPath: (householdId: string) => string;
  itemPath: (householdId: string) => string;
  namePlaceholder: string;
  slugPlaceholder: string;
}) {
  const { householdId, status } = useActiveHouseholdId();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("100");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    const [cats, rows] = await Promise.all([
      apiFetch<Category[]>(categoryPath(householdId)),
      apiFetch<Item[]>(itemPath(householdId)),
    ]);
    setCategories(cats);
    setItems(rows);
  }, [householdId, categoryPath, itemPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const inUseCount = useMemo(
    () => (archiveId ? items.filter((item) => item.categoryId === archiveId).length : 0),
    [items, archiveId]
  );
  const candidates = useMemo(
    () => categories.filter((category) => category.id !== archiveId),
    [categories, archiveId]
  );

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading session...</p>;
  }
  if (!householdId) {
    return <p className="text-sm text-muted-foreground">No household in session.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">System + household custom categories.</p>
      </div>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Category Name
          </label>
          <input
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            placeholder={namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Category Slug (Unique Key)
          </label>
          <input
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            placeholder={slugPlaceholder}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Sort Order (Lower First)
          </label>
          <input
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
            placeholder="100"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="inline-flex self-end justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={async () => {
            try {
              await apiFetch(categoryPath(householdId), {
                method: "POST",
                body: JSON.stringify({ name, slug, sortOrder: Number(sortOrder) }),
              });
              setName("");
              setSlug("");
              setSortOrder("100");
              setMessage("Category created.");
              setError(null);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to create category.");
            }
          }}
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Slug</th>
              <th className="px-4 py-2 text-left">Scope</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-2.5">{category.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{category.slug}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {category.isSystem ? "System" : "Household"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!category.isSystem && (
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditName(category.name);
                          setEditSlug(category.slug);
                          setEditSortOrder(String(category.sortOrder));
                        }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive"
                        onClick={() => {
                          setArchiveId(category.id);
                          setReplacementId("");
                        }}
                      >
                        <Trash2 size={12} /> Archive
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Category Name
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Category Slug (Unique Key)
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Sort Order (Lower First)
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={editSortOrder}
              onChange={(e) => setEditSortOrder(e.target.value)}
            />
          </div>
          <div className="flex gap-2 self-end">
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={async () => {
                try {
                  await apiFetch(`${categoryPath(householdId)}/${editingId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: editName,
                      slug: editSlug,
                      sortOrder: Number(editSortOrder),
                    }),
                  });
                  setEditingId(null);
                  setMessage("Category updated.");
                  setError(null);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to update category.");
                }
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-4 py-2 text-sm"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {archiveId && (
        <div className="space-y-2 rounded-md border border-yellow-700/50 bg-yellow-950/20 p-3">
          <p className="text-sm text-yellow-300">
            This category is used by {inUseCount} active items. Select replacement before archiving.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-yellow-100">
                Replacement Category for Reassignment
              </label>
              <select
                value={replacementId}
                onChange={(e) => setReplacementId(e.target.value)}
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              >
                <option value="">Select replacement</option>
                {candidates.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={inUseCount > 0 && !replacementId}
              className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              onClick={async () => {
                try {
                  const path = replacementId
                    ? `${categoryPath(householdId)}/${archiveId}?replacementCategoryId=${encodeURIComponent(replacementId)}`
                    : `${categoryPath(householdId)}/${archiveId}`;
                  await apiFetch(path, { method: "DELETE" });
                  setArchiveId(null);
                  setReplacementId("");
                  setMessage("Category archived.");
                  setError(null);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to archive category.");
                }
              }}
            >
              Reassign + Archive
            </button>
            <button
              type="button"
              className="self-end rounded-md border border-border px-4 py-2 text-sm"
              onClick={() => {
                setArchiveId(null);
                setReplacementId("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
