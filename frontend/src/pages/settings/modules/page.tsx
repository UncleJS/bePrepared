"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Category = { id: string; slug: string; title: string; sortOrder: number };
type Module = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  iconName?: string | null;
  sortOrder: number;
  categoryId: string;
};
type Section = { id: string; moduleId: string; slug: string; title: string; sortOrder: number };
type GuidanceDoc = {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  badgeJson?: string | null;
  sortOrder: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function reindex<T extends { id: string }>(items: T[]): Array<{ id: string; sortOrder: number }> {
  return items.map((item, i) => ({ id: item.id, sortOrder: (i + 1) * 10 }));
}

// ---------------------------------------------------------------------------
// Drag-and-drop hook (HTML5 native)
// ---------------------------------------------------------------------------
function useDrag<T extends { id: string }>(items: T[], onReorder: (reordered: T[]) => void) {
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  function onDragStart(id: string) {
    dragId.current = id;
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    dragOverId.current = id;
  }
  function onDrop() {
    const from = dragId.current;
    const to = dragOverId.current;
    if (!from || !to || from === to) return;
    const next = [...items];
    const fromIdx = next.findIndex((i) => i.id === from);
    const toIdx = next.findIndex((i) => i.id === to);
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    dragId.current = null;
    dragOverId.current = null;
    onReorder(next);
  }

  return { onDragStart, onDragOver, onDrop };
}

// ---------------------------------------------------------------------------
// Small reusable inline edit field
// ---------------------------------------------------------------------------
function InlineInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      className={`rounded border border-border bg-muted px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${className ?? ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ---------------------------------------------------------------------------
// Confirm-on-second-click archive button
// ---------------------------------------------------------------------------
function ArchiveButton({
  onConfirm,
  label = "Archive",
}: {
  onConfirm: () => void;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded border border-destructive px-2 py-1 text-xs text-destructive"
        onClick={() => {
          setConfirming(false);
          onConfirm();
        }}
      >
        <Trash2 size={11} /> Confirm
      </button>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
      onClick={() => setConfirming(true)}
      title={label}
    >
      <Trash2 size={11} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Guidance Docs list
// ---------------------------------------------------------------------------
function DocList({
  sectionId,
  moduleId,
  docs,
  onReload,
}: {
  sectionId: string;
  moduleId: string;
  docs: GuidanceDoc[];
  onReload: () => void;
}) {
  const [localDocs, setLocalDocs] = useState(docs);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLocalDocs(docs);
  }, [docs]);

  const {
    onDragStart,
    onDragOver,
    onDrop: rawDrop,
  } = useDrag(localDocs, async (reordered) => {
    setLocalDocs(reordered);
    try {
      await apiFetch(`/modules/${moduleId}/sections/${sectionId}/docs/reorder`, {
        method: "PUT",
        body: JSON.stringify({ items: reindex(reordered) }),
      });
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      setLocalDocs(docs); // revert
    }
  });

  async function saveEdit(doc: GuidanceDoc) {
    try {
      await apiFetch(`/modules/${moduleId}/sections/${sectionId}/docs/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, body: editBody, badgeJson: editBadge || null }),
      });
      setEditId(null);
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addDoc() {
    if (!newTitle.trim() || !newBody.trim()) return;
    try {
      await apiFetch(`/modules/${moduleId}/sections/${sectionId}/docs`, {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          body: newBody,
          sortOrder: (localDocs.length + 1) * 10,
        }),
      });
      setNewTitle("");
      setNewBody("");
      setAddOpen(false);
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function archiveDoc(docId: string) {
    try {
      await apiFetch(`/modules/${moduleId}/sections/${sectionId}/docs/${docId}`, {
        method: "DELETE",
      });
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Archive failed");
    }
  }

  return (
    <div className="ml-6 mt-2 space-y-2">
      {err && <p className="text-xs text-destructive">{err}</p>}

      {localDocs.map((doc) => (
        <div
          key={doc.id}
          draggable
          onDragStart={() => onDragStart(doc.id)}
          onDragOver={(e) => onDragOver(e, doc.id)}
          onDrop={rawDrop}
          className="rounded border border-border bg-card/50"
        >
          {editId === doc.id ? (
            <div className="space-y-2 p-3">
              <InlineInput
                value={editTitle}
                onChange={setEditTitle}
                placeholder="Title"
                className="w-full"
              />
              <textarea
                className="w-full rounded border border-border bg-muted px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Markdown body..."
              />
              <InlineInput
                value={editBadge}
                onChange={setEditBadge}
                placeholder='Badge JSON (optional, e.g. [{"label":"..."}])'
                className="w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  onClick={() => saveEdit(doc)}
                >
                  <Check size={11} /> Save
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-3 py-1 text-xs"
                  onClick={() => setEditId(null)}
                >
                  <X size={11} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-2">
              <GripVertical
                size={14}
                className="mt-0.5 shrink-0 cursor-grab text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{doc.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{doc.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                  onClick={() => {
                    setEditId(doc.id);
                    setEditTitle(doc.title);
                    setEditBody(doc.body);
                    setEditBadge(doc.badgeJson ?? "");
                  }}
                >
                  <Pencil size={11} />
                </button>
                <ArchiveButton onConfirm={() => archiveDoc(doc.id)} />
              </div>
            </div>
          )}
        </div>
      ))}

      {addOpen ? (
        <div className="space-y-2 rounded border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            New Guidance Doc
          </p>
          <InlineInput
            value={newTitle}
            onChange={setNewTitle}
            placeholder="Title"
            className="w-full"
          />
          <textarea
            className="w-full rounded border border-border bg-muted px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            rows={5}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Markdown body..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!newTitle.trim() || !newBody.trim()}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              onClick={addDoc}
            >
              <Check size={11} /> Add
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-border px-3 py-1 text-xs"
              onClick={() => setAddOpen(false)}
            >
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={11} /> Add Guidance Doc
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section list
// ---------------------------------------------------------------------------
function SectionList({
  moduleId,
  sections: initialSections,
  onReload,
}: {
  moduleId: string;
  sections: Section[];
  onReload: () => void;
}) {
  const [localSecs, setLocalSecs] = useState(initialSections);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLocalSecs(initialSections);
  }, [initialSections]);

  async function toggleSection(sec: Section) {
    const next = new Set(expanded);
    if (next.has(sec.id)) {
      next.delete(sec.id);
    } else {
      next.add(sec.id);
    }
    setExpanded(next);
  }

  const {
    onDragStart,
    onDragOver,
    onDrop: rawDrop,
  } = useDrag(localSecs, async (reordered) => {
    setLocalSecs(reordered);
    try {
      await apiFetch(`/modules/${moduleId}/sections/reorder`, {
        method: "PUT",
        body: JSON.stringify({ items: reindex(reordered) }),
      });
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      setLocalSecs(initialSections);
    }
  });

  async function saveEdit(sec: Section) {
    try {
      await apiFetch(`/modules/${moduleId}/sections/${sec.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, slug: editSlug }),
      });
      setEditId(null);
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addSection() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    try {
      await apiFetch(`/modules/${moduleId}/sections`, {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          sortOrder: (localSecs.length + 1) * 10,
        }),
      });
      setNewTitle("");
      setNewSlug("");
      setAddOpen(false);
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function archiveSection(sectionId: string) {
    try {
      await apiFetch(`/modules/${moduleId}/sections/${sectionId}`, { method: "DELETE" });
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Archive failed");
    }
  }

  return (
    <div className="ml-6 mt-2 space-y-1">
      {err && <p className="text-xs text-destructive">{err}</p>}

      {localSecs.map((sec) => (
        <div key={sec.id} className="rounded border border-border bg-background">
          {editId === sec.id ? (
            <div className="flex flex-wrap items-center gap-2 p-2">
              <InlineInput
                value={editTitle}
                onChange={setEditTitle}
                placeholder="Title"
                className="flex-1"
              />
              <InlineInput
                value={editSlug}
                onChange={setEditSlug}
                placeholder="slug"
                className="w-32"
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
                onClick={() => saveEdit(sec)}
              >
                <Check size={11} /> Save
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                onClick={() => setEditId(null)}
              >
                <X size={11} /> Cancel
              </button>
            </div>
          ) : (
            <div
              draggable
              onDragStart={() => onDragStart(sec.id)}
              onDragOver={(e) => onDragOver(e, sec.id)}
              onDrop={rawDrop}
              className="flex items-center gap-2 p-2"
            >
              <GripVertical size={14} className="shrink-0 cursor-grab text-muted-foreground" />
              <button
                type="button"
                className="flex flex-1 items-center gap-1 text-left"
                onClick={() => toggleSection(sec)}
              >
                {expanded.has(sec.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span className="text-sm font-medium">{sec.title}</span>
                <span className="ml-1 text-xs text-muted-foreground">/{sec.slug}</span>
              </button>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                  onClick={() => {
                    setEditId(sec.id);
                    setEditTitle(sec.title);
                    setEditSlug(sec.slug);
                  }}
                >
                  <Pencil size={11} />
                </button>
                <ArchiveButton onConfirm={() => archiveSection(sec.id)} />
              </div>
            </div>
          )}

          {expanded.has(sec.id) && (
            <DocListByModule moduleId={moduleId} sectionId={sec.id} onReload={onReload} />
          )}
        </div>
      ))}

      {addOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-card p-2">
          <InlineInput
            value={newTitle}
            onChange={setNewTitle}
            placeholder="Section title"
            className="flex-1"
          />
          <InlineInput value={newSlug} onChange={setNewSlug} placeholder="slug" className="w-32" />
          <button
            type="button"
            disabled={!newTitle.trim() || !newSlug.trim()}
            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            onClick={addSection}
          >
            <Check size={11} /> Add
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
            onClick={() => setAddOpen(false)}
          >
            <X size={11} /> Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={11} /> Add Section
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocList loaded inline within the section (fetches via module slug endpoint)
// We need docs loaded per-section — we'll pass them through moduleSlug fetch
// ---------------------------------------------------------------------------
function DocListByModule({
  moduleId,
  sectionId,
  onReload,
}: {
  moduleId: string;
  sectionId: string;
  onReload: () => void;
}) {
  const [docs, setDocs] = useState<GuidanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);

  // We can't call GET /modules/:slug without the slug, but we have all modules in parent.
  // Use the all-modules endpoint to find slug, then fetch detail.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const allMods = await apiFetch<Array<{ id: string; slug: string }>>("/modules");
      const found = allMods.find((m) => m.id === moduleId);
      if (!found) return;
      setModuleSlug(found.slug);
      const detail = await apiFetch<{
        sections: Array<{ id: string; guidanceDocs: GuidanceDoc[] }>;
      }>(`/modules/${found.slug}`);
      const sec = detail.sections.find((s) => s.id === sectionId);
      setDocs(sec?.guidanceDocs ?? []);
    } finally {
      setLoading(false);
    }
  }, [moduleId, sectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="ml-6 py-2 text-xs text-muted-foreground">Loading docs…</p>;
  if (!moduleSlug) return null;

  return (
    <DocList
      sectionId={sectionId}
      moduleId={moduleSlug}
      docs={docs}
      onReload={() => {
        void load();
        onReload();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Module list (within a category)
// ---------------------------------------------------------------------------
function ModuleList({
  categoryId,
  modules: initialModules,
  allSections: initialAllSections,
  onReload,
}: {
  categoryId: string;
  modules: Module[];
  allSections: Section[];
  onReload: () => void;
}) {
  const [localMods, setLocalMods] = useState(initialModules);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLocalMods(initialModules);
  }, [initialModules]);

  const sectionsByModule = new Map<string, Section[]>();
  for (const s of initialAllSections) {
    const list = sectionsByModule.get(s.moduleId) ?? [];
    list.push(s);
    sectionsByModule.set(s.moduleId, list);
  }

  const {
    onDragStart,
    onDragOver,
    onDrop: rawDrop,
  } = useDrag(localMods, async (reordered) => {
    setLocalMods(reordered);
    try {
      await apiFetch("/modules/reorder", {
        method: "PUT",
        body: JSON.stringify({ items: reindex(reordered) }),
      });
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      setLocalMods(initialModules);
    }
  });

  async function saveEdit(mod: Module) {
    try {
      await apiFetch(`/modules/${mod.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      setEditId(null);
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addModule() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    try {
      await apiFetch("/modules", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          description: newDesc,
          categoryId,
          sortOrder: (localMods.length + 1) * 10,
        }),
      });
      setNewTitle("");
      setNewSlug("");
      setNewDesc("");
      setAddOpen(false);
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function archiveModule(modId: string) {
    try {
      await apiFetch(`/modules/${modId}`, { method: "DELETE" });
      onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Archive failed");
    }
  }

  return (
    <div className="ml-6 mt-2 space-y-1">
      {err && <p className="text-xs text-destructive">{err}</p>}

      {localMods.map((mod) => (
        <div key={mod.id} className="rounded border border-border bg-card/30">
          {editId === mod.id ? (
            <div className="space-y-2 p-2">
              <InlineInput
                value={editTitle}
                onChange={setEditTitle}
                placeholder="Title"
                className="w-full"
              />
              <InlineInput
                value={editDesc}
                onChange={setEditDesc}
                placeholder="Description (optional)"
                className="w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
                  onClick={() => saveEdit(mod)}
                >
                  <Check size={11} /> Save
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                  onClick={() => setEditId(null)}
                >
                  <X size={11} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              draggable
              onDragStart={() => onDragStart(mod.id)}
              onDragOver={(e) => onDragOver(e, mod.id)}
              onDrop={rawDrop}
              className="flex items-center gap-2 p-2"
            >
              <GripVertical size={14} className="shrink-0 cursor-grab text-muted-foreground" />
              <button
                type="button"
                className="flex flex-1 items-center gap-1 text-left"
                onClick={() => {
                  const next = new Set(expanded);
                  next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                  setExpanded(next);
                }}
              >
                {expanded.has(mod.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span className="text-sm font-semibold">{mod.title}</span>
                {mod.description && (
                  <span className="ml-2 hidden text-xs text-muted-foreground md:block line-clamp-1">
                    — {mod.description}
                  </span>
                )}
              </button>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                  onClick={() => {
                    setEditId(mod.id);
                    setEditTitle(mod.title);
                    setEditDesc(mod.description ?? "");
                  }}
                >
                  <Pencil size={11} />
                </button>
                <ArchiveButton onConfirm={() => archiveModule(mod.id)} />
              </div>
            </div>
          )}

          {expanded.has(mod.id) && (
            <SectionList
              moduleId={mod.id}
              sections={sectionsByModule.get(mod.id) ?? []}
              onReload={onReload}
            />
          )}
        </div>
      ))}

      {addOpen ? (
        <div className="space-y-2 rounded border border-border bg-card p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">New Module</p>
          <div className="flex flex-wrap gap-2">
            <InlineInput
              value={newTitle}
              onChange={setNewTitle}
              placeholder="Title"
              className="flex-1"
            />
            <InlineInput
              value={newSlug}
              onChange={setNewSlug}
              placeholder="slug"
              className="w-36"
            />
          </div>
          <InlineInput
            value={newDesc}
            onChange={setNewDesc}
            placeholder="Description (optional)"
            className="w-full"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!newTitle.trim() || !newSlug.trim()}
              className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              onClick={addModule}
            >
              <Check size={11} /> Add
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
              onClick={() => setAddOpen(false)}
            >
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={11} /> Add Module
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ModulesAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allModules, setAllModules] = useState<Array<Module & { sections: Section[] }>>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatTitle, setEditCatTitle] = useState("");
  const [editCatSlug, setEditCatSlug] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cats, mods] = await Promise.all([
        apiFetch<Category[]>("/module-categories"),
        apiFetch<Array<Module & { sections: Section[] }>>("/modules"),
      ]);
      setCategories(cats.sort((a, b) => a.sortOrder - b.sortOrder));
      setAllModules(mods);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const me = await apiFetch<{ isAdmin: boolean }>("/users/me");
        if (!me.isAdmin) {
          setIsAdmin(false);
          return;
        }
        setIsAdmin(true);
        await load();
      } catch {
        setIsAdmin(false);
      }
    }
    void init();
  }, [load]);

  // drag for categories
  const {
    onDragStart: catDragStart,
    onDragOver: catDragOver,
    onDrop: catDropRaw,
  } = useDrag(categories, async (reordered) => {
    setCategories(reordered);
    try {
      await apiFetch("/module-categories/reorder", {
        method: "PUT",
        body: JSON.stringify({ items: reindex(reordered) }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      await load();
    }
  });

  async function saveCatEdit(cat: Category) {
    try {
      await apiFetch(`/module-categories/${cat.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editCatTitle, slug: editCatSlug }),
      });
      setEditCatId(null);
      setMsg("Category updated.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function addCategory() {
    if (!newCatTitle.trim() || !newCatSlug.trim()) return;
    try {
      await apiFetch("/module-categories", {
        method: "POST",
        body: JSON.stringify({
          title: newCatTitle,
          slug: newCatSlug,
          sortOrder: (categories.length + 1) * 10,
        }),
      });
      setNewCatTitle("");
      setNewCatSlug("");
      setAddCatOpen(false);
      setMsg("Category created.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function archiveCategory(catId: string) {
    try {
      await apiFetch(`/module-categories/${catId}`, { method: "DELETE" });
      setMsg("Category archived.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Archive failed");
    }
  }

  // ---- guards ----
  if (isAdmin === null) {
    return <p className="text-sm text-muted-foreground">Checking access…</p>;
  }
  if (isAdmin === false) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Module Content</h1>
        <p className="text-sm text-destructive">Admin access required.</p>
      </div>
    );
  }

  // Build lookup maps
  const modsByCategory = new Map<string, typeof allModules>();
  for (const mod of allModules) {
    const list = modsByCategory.get(mod.categoryId) ?? [];
    list.push(mod);
    modsByCategory.set(mod.categoryId, list);
  }

  const allSections = allModules.flatMap((m) => m.sections ?? []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-2xl font-bold">Module Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage categories, modules, sections, and guidance docs. Drag rows to reorder.
        </p>
      </div>

      {msg && (
        <p className="text-sm text-emerald-400">
          {msg}{" "}
          <button className="underline text-xs" onClick={() => setMsg(null)}>
            dismiss
          </button>
        </p>
      )}
      {err && (
        <p className="text-sm text-destructive">
          {err}{" "}
          <button className="underline text-xs" onClick={() => setErr(null)}>
            dismiss
          </button>
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Category list                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-lg border border-border bg-card">
            {/* Category header row */}
            {editCatId === cat.id ? (
              <div className="flex flex-wrap items-center gap-2 p-3">
                <InlineInput
                  value={editCatTitle}
                  onChange={setEditCatTitle}
                  placeholder="Category title"
                  className="flex-1"
                />
                <InlineInput
                  value={editCatSlug}
                  onChange={setEditCatSlug}
                  placeholder="slug"
                  className="w-36"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  onClick={() => saveCatEdit(cat)}
                >
                  <Check size={11} /> Save
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-border px-3 py-1 text-xs"
                  onClick={() => setEditCatId(null)}
                >
                  <X size={11} /> Cancel
                </button>
              </div>
            ) : (
              <div
                draggable
                onDragStart={() => catDragStart(cat.id)}
                onDragOver={(e) => catDragOver(e, cat.id)}
                onDrop={catDropRaw}
                className="flex items-center gap-2 p-3"
              >
                <GripVertical size={15} className="shrink-0 cursor-grab text-muted-foreground" />
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => {
                    const next = new Set(expanded);
                    next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                    setExpanded(next);
                  }}
                >
                  {expanded.has(cat.id) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <span className="font-semibold">{cat.title}</span>
                  <span className="text-xs text-muted-foreground">/{cat.slug}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {(modsByCategory.get(cat.id) ?? []).length} module
                    {(modsByCategory.get(cat.id) ?? []).length !== 1 ? "s" : ""}
                  </span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                    onClick={() => {
                      setEditCatId(cat.id);
                      setEditCatTitle(cat.title);
                      setEditCatSlug(cat.slug);
                    }}
                  >
                    <Pencil size={11} />
                  </button>
                  <ArchiveButton onConfirm={() => archiveCategory(cat.id)} />
                </div>
              </div>
            )}

            {/* Expanded: modules within this category */}
            {expanded.has(cat.id) && (
              <div className="border-t border-border pb-3">
                <ModuleList
                  categoryId={cat.id}
                  modules={(modsByCategory.get(cat.id) ?? []).sort(
                    (a, b) => a.sortOrder - b.sortOrder
                  )}
                  allSections={allSections}
                  onReload={load}
                />
              </div>
            )}
          </div>
        ))}

        {/* Add category form */}
        {addCatOpen ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
            <InlineInput
              value={newCatTitle}
              onChange={setNewCatTitle}
              placeholder="Category title"
              className="flex-1"
            />
            <InlineInput
              value={newCatSlug}
              onChange={setNewCatSlug}
              placeholder="slug"
              className="w-36"
            />
            <button
              type="button"
              disabled={!newCatTitle.trim() || !newCatSlug.trim()}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              onClick={addCategory}
            >
              <Check size={11} /> Add Category
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-border px-3 py-1 text-xs"
              onClick={() => setAddCatOpen(false)}
            >
              <X size={11} /> Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
            onClick={() => setAddCatOpen(true)}
          >
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>
    </div>
  );
}
