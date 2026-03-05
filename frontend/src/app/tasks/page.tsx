"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { CheckSquare, Square, ChevronDown, ChevronRight, Pencil } from "lucide-react";

type Task = {
  id: string;
  sectionId?: string | null;
  title: string;
  description?: string;
  taskClass: string;
  readinessLevel: string;
  scenario: string;
  moduleId: string;
  isRecurring?: boolean;
  recurDays?: number | null;
  sortOrder?: number;
  evidencePrompt?: string | null;
};

type Module = {
  id: string;
  title: string;
  sections: { id: string; title: string }[];
};

type Progress = {
  id: string;
  taskId: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  completedAt?: string;
  evidenceNote?: string;
};

const LEVEL_LABELS: Record<string, string> = {
  l1_72h: "Level 1 — 72 Hours",
  l2_14d: "Level 2 — 14 Days",
  l3_30d: "Level 3 — 30 Days",
  l4_90d: "Level 4 — 90 Days",
};

const LEVEL_ORDER = ["l1_72h", "l2_14d", "l3_30d", "l4_90d"];

const TASK_CLASSES = ["acquire", "prepare", "test", "maintain", "document"] as const;
const SCENARIOS = ["both", "shelter_in_place", "evacuation"] as const;

type TaskForm = {
  moduleId: string;
  sectionId: string;
  title: string;
  description: string;
  taskClass: string;
  readinessLevel: string;
  scenario: string;
  isRecurring: boolean;
  recurDays: string;
  sortOrder: string;
  evidencePrompt: string;
};

const EMPTY_FORM: TaskForm = {
  moduleId: "",
  sectionId: "",
  title: "",
  description: "",
  taskClass: "acquire",
  readinessLevel: "l1_72h",
  scenario: "both",
  isRecurring: false,
  recurDays: "",
  sortOrder: "0",
  evidencePrompt: "",
};

function toForm(task: Task): TaskForm {
  return {
    moduleId: task.moduleId,
    sectionId: task.sectionId ?? "",
    title: task.title,
    description: task.description ?? "",
    taskClass: task.taskClass,
    readinessLevel: task.readinessLevel,
    scenario: task.scenario,
    isRecurring: Boolean(task.isRecurring),
    recurDays: task.recurDays ? String(task.recurDays) : "",
    sortOrder: task.sortOrder != null ? String(task.sortOrder) : "0",
    evidencePrompt: task.evidencePrompt ?? "",
  };
}

function toPayload(form: TaskForm) {
  return {
    moduleId: form.moduleId,
    sectionId: form.sectionId || undefined,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    taskClass: form.taskClass,
    readinessLevel: form.readinessLevel,
    scenario: form.scenario,
    isRecurring: form.isRecurring,
    recurDays: form.isRecurring && form.recurDays.trim() ? Number(form.recurDays) : undefined,
    sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : 0,
    evidencePrompt: form.evidencePrompt.trim() || undefined,
  };
}

export default function TasksPage() {
  const { householdId, status, user } = useActiveHouseholdId();

  const [tasks, setTasks]       = useState<Task[]>([]);
  const [modules, setModules]   = useState<Module[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ l1_72h: true });
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = Boolean((user as { isAdmin?: boolean } | undefined)?.isAdmin);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);
    try {
      const [t, p, m] = await Promise.all([
        apiFetch<Task[]>("/tasks"),
        apiFetch<Progress[]>(`/tasks/${householdId}/progress`),
        apiFetch<Module[]>("/modules"),
      ]);

      const deduped = new Map<string, Task>();
      for (const task of t) {
        const key = `${task.moduleId}:${task.readinessLevel}:${task.scenario}:${task.title.trim().toLowerCase()}`;
        if (!deduped.has(key)) deduped.set(key, task);
      }
      setTasks(Array.from(deduped.values()));

      const map: Record<string, Progress> = {};
      p.forEach((pr) => { map[pr.taskId] = pr; });
      setProgress(map);

      setModules(m);
      setCreateForm((prev) => {
        if (prev.moduleId || m.length === 0) return prev;
        return { ...prev, moduleId: m[0].id };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function toggle(task: Task) {
    if (!householdId) return;

    const existing = progress[task.id];
    const newStatus = existing?.status === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : undefined;

    // Optimistic update
    setProgress((prev) => ({
      ...prev,
      [task.id]: { ...existing, id: existing?.id ?? "", taskId: task.id, status: newStatus, completedAt },
    }));

    try {
      if (existing?.id) {
        await apiFetch(`/tasks/${householdId}/progress/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, completedAt }),
        });
      } else {
        const created = await apiFetch<Progress>(`/tasks/${householdId}/progress`, {
          method: "POST",
          body: JSON.stringify({ taskId: task.id, status: newStatus, completedAt }),
        });
        setProgress((prev) => ({ ...prev, [task.id]: created }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const moduleById = useMemo(() => {
    const map: Record<string, Module> = {};
    modules.forEach((m) => { map[m.id] = m; });
    return map;
  }, [modules]);

  const byLevel = LEVEL_ORDER.map((lvl) => ({
    level: lvl,
    tasks: tasks.filter((t) => t.readinessLevel === lvl),
  }));

  const editingTask = editingId ? tasks.find((t) => t.id === editingId) : null;

  async function createTask() {
    if (!createForm.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!createForm.moduleId) {
      setError("Module is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(toPayload(createForm)),
      });
      setCreateForm((prev) => ({ ...EMPTY_FORM, moduleId: prev.moduleId || modules[0]?.id || "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask() {
    if (!editingId) return;
    if (!editForm.title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch<Task>(`/tasks/by-id/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(toPayload(editForm)),
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <p className="text-muted-foreground text-sm">Loading session…</p>;
  if (!householdId) return <p className="text-muted-foreground text-sm">No household in session.</p>;
  if (loading) return <p className="text-muted-foreground text-sm">Loading ticksheets…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ticksheets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Work through each readiness level systematically
        </p>
      </div>

      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Add Task</h2>
          <TaskFormFields
            form={createForm}
            setForm={setCreateForm}
            modules={modules}
          />
          <button
            type="button"
            onClick={createTask}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Create Task
          </button>
        </section>
      )}

      {isAdmin && editingTask && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Edit Task</h2>
          <TaskFormFields
            form={editForm}
            setForm={setEditForm}
            modules={modules}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={updateTask}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {byLevel.map(({ level, tasks: lvlTasks }) => {
        const done  = lvlTasks.filter((t) => progress[t.id]?.status === "completed").length;
        const total = lvlTasks.length;
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        const open  = expanded[level] ?? false;

        return (
          <section key={level} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setExpanded((e) => ({ ...e, [level]: !open }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-semibold">{LEVEL_LABELS[level]}</span>
                <span className="text-xs text-muted-foreground">
                  {done}/{total} tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
              </div>
            </button>

            {open && (
              <ul className="divide-y divide-border">
                {lvlTasks.map((task) => {
                  const done = progress[task.id]?.status === "completed";
                  const moduleTitle = moduleById[task.moduleId]?.title ?? "Unknown module";
                  const sectionTitle = moduleById[task.moduleId]?.sections.find((s) => s.id === task.sectionId)?.title;
                  return (
                    <li key={task.id} className="px-4 py-3 hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => toggle(task)}
                          className="flex items-start gap-3 text-left"
                        >
                          {done ? (
                            <CheckSquare size={18} className="text-primary mt-0.5 shrink-0" />
                          ) : (
                            <Square size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge>{task.taskClass}</Badge>
                              <Badge variant="outline">{moduleTitle}</Badge>
                              {sectionTitle && <Badge variant="outline">{sectionTitle}</Badge>}
                              {task.scenario !== "both" && <Badge variant="outline">{task.scenario}</Badge>}
                            </div>
                          </div>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(task.id);
                              setEditForm(toForm(task));
                            }}
                            className="rounded-md border border-border px-2 py-1 text-xs inline-flex items-center gap-1"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                {lvlTasks.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">No tasks for this level.</li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TaskFormFields({
  form,
  setForm,
  modules,
}: {
  form: TaskForm;
  setForm: Dispatch<SetStateAction<TaskForm>>;
  modules: Module[];
}) {
  const sections = useMemo(
    () => modules.find((m) => m.id === form.moduleId)?.sections ?? [],
    [modules, form.moduleId]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1 md:col-span-2">
        <label className="block text-xs font-bold uppercase tracking-wide">Task Title *</label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Sort Order</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.sortOrder}
          onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Module *</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.moduleId}
          onChange={(e) => setForm((prev) => ({ ...prev, moduleId: e.target.value, sectionId: "" }))}
        >
          <option value="">Select module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Section</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.sectionId}
          onChange={(e) => setForm((prev) => ({ ...prev, sectionId: e.target.value }))}
          disabled={sections.length === 0}
        >
          <option value="">None</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Task Class</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.taskClass}
          onChange={(e) => setForm((prev) => ({ ...prev, taskClass: e.target.value }))}
        >
          {TASK_CLASSES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Readiness Level</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.readinessLevel}
          onChange={(e) => setForm((prev) => ({ ...prev, readinessLevel: e.target.value }))}
        >
          {LEVEL_ORDER.map((v) => <option key={v} value={v}>{LEVEL_LABELS[v]}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Scenario</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.scenario}
          onChange={(e) => setForm((prev) => ({ ...prev, scenario: e.target.value }))}
        >
          {SCENARIOS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="space-y-1 md:col-span-3">
        <label className="block text-xs font-bold uppercase tracking-wide">Description</label>
        <textarea
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-1 md:col-span-3">
        <label className="block text-xs font-bold uppercase tracking-wide">Evidence Prompt</label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.evidencePrompt}
          onChange={(e) => setForm((prev) => ({ ...prev, evidencePrompt: e.target.value }))}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm md:col-span-1">
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => setForm((prev) => ({
            ...prev,
            isRecurring: e.target.checked,
            recurDays: e.target.checked ? prev.recurDays : "",
          }))}
        />
        Recurring task
      </label>

      <div className="space-y-1 md:col-span-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Recur Days</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.recurDays}
          disabled={!form.isRecurring}
          onChange={(e) => setForm((prev) => ({ ...prev, recurDays: e.target.value }))}
        />
      </div>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "outline" }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
        variant === "outline"
          ? "border border-border text-muted-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </span>
  );
}
