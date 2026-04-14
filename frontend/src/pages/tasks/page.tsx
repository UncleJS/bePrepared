"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { CheckSquare, ChevronDown, ChevronRight, Pencil, Square } from "lucide-react";
import { Badge } from "./Badge";
import { EMPTY_FORM, LEVEL_LABELS } from "./constants";
import { toForm, toPayload } from "./formUtils";
import { TaskFormFields } from "./TaskFormFields";
import type { TaskForm } from "./types";
import { useTasksData } from "./useTasksData";

export default function TasksPage() {
  const { householdId, isLoading, user } = useActiveHouseholdId();
  const {
    tasks,
    modules,
    progress,
    loading,
    error,
    setError,
    loadData,
    toggleTask,
    moduleById,
    tasksByLevel,
  } = useTasksData(householdId);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ l1_72h: true });
  const [createForm, setCreateForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = Boolean((user as { isAdmin?: boolean } | undefined)?.isAdmin);
  const editingTask = useMemo(
    () => (editingId ? tasks.find((t) => t.id === editingId) : null),
    [editingId, tasks]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (createForm.moduleId || modules.length === 0) return;
    setCreateForm((prev) => ({ ...prev, moduleId: modules[0].id }));
  }, [modules, createForm.moduleId]);

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
      await apiFetch("/tasks", {
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
      await apiFetch(`/tasks/by-id/${editingId}`, {
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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading session...</p>;
  }
  if (!householdId) {
    return <p className="text-sm text-muted-foreground">No household in session.</p>;
  }
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading ticksheets...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ticksheets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work through each readiness level systematically
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {isAdmin && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Add Task</h2>
          <TaskFormFields form={createForm} setForm={setCreateForm} modules={modules} />
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
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Edit Task</h2>
          <TaskFormFields form={editForm} setForm={setEditForm} modules={modules} />
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

      {tasksByLevel.map(({ level, tasks: levelTasks }) => {
        const doneCount = levelTasks.filter(
          (task) => progress[task.id]?.status === "completed"
        ).length;
        const totalCount = levelTasks.length;
        const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const open = expanded[level] ?? false;

        return (
          <section key={level} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [level]: !open }))}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-semibold">{LEVEL_LABELS[level]}</span>
                <span className="text-xs text-muted-foreground">
                  {doneCount}/{totalCount} tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">{percent}%</span>
              </div>
            </button>

            {open && (
              <ul className="divide-y divide-border">
                {levelTasks.map((task) => {
                  const isDone = progress[task.id]?.status === "completed";
                  const moduleTitle = moduleById[task.moduleId]?.title ?? "Unknown module";
                  const sectionTitle = moduleById[task.moduleId]?.sections.find(
                    (section) => section.id === task.sectionId
                  )?.title;

                  return (
                    <li key={task.id} className="px-4 py-3 transition-colors hover:bg-accent">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => void toggleTask(task)}
                          className="flex items-start gap-3 text-left"
                        >
                          {isDone ? (
                            <CheckSquare size={18} className="mt-0.5 shrink-0 text-primary" />
                          ) : (
                            <Square size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                isDone ? "text-muted-foreground line-through" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge>{task.taskClass}</Badge>
                              <Badge variant="outline">{moduleTitle}</Badge>
                              {sectionTitle && <Badge variant="outline">{sectionTitle}</Badge>}
                              {task.scenario !== "both" && (
                                <Badge variant="outline">{task.scenario}</Badge>
                              )}
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
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                {levelTasks.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    No tasks for this level.
                  </li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
