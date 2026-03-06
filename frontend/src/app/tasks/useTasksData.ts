import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { LEVEL_ORDER } from "./constants";
import type { Module, Progress, Task } from "./types";

export function useTasksData(householdId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);
    try {
      const [taskRows, progressRows, moduleRows] = await Promise.all([
        apiFetch<Task[]>("/tasks"),
        apiFetch<Progress[]>(`/tasks/${householdId}/progress`),
        apiFetch<Module[]>("/modules"),
      ]);

      const deduped = new Map<string, Task>();
      for (const task of taskRows) {
        const key = `${task.moduleId}:${task.readinessLevel}:${task.scenario}:${task.title.trim().toLowerCase()}`;
        if (!deduped.has(key)) deduped.set(key, task);
      }
      setTasks(Array.from(deduped.values()));

      const progressMap: Record<string, Progress> = {};
      progressRows.forEach((row) => {
        progressMap[row.taskId] = row;
      });
      setProgress(progressMap);

      setModules(moduleRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  const toggleTask = useCallback(
    async (task: Task) => {
      if (!householdId) return;

      const existing = progress[task.id];
      const nextStatus = existing?.status === "completed" ? "pending" : "completed";
      const completedAt = nextStatus === "completed" ? new Date().toISOString() : undefined;

      setProgress((prev) => ({
        ...prev,
        [task.id]: {
          ...existing,
          id: existing?.id ?? "",
          taskId: task.id,
          status: nextStatus,
          completedAt,
        },
      }));

      try {
        if (existing?.id) {
          await apiFetch(`/tasks/${householdId}/progress/${existing.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus, completedAt }),
          });
          return;
        }

        const created = await apiFetch<Progress>(`/tasks/${householdId}/progress`, {
          method: "POST",
          body: JSON.stringify({ taskId: task.id, status: nextStatus, completedAt }),
        });
        setProgress((prev) => ({ ...prev, [task.id]: created }));
      } catch (err) {
        console.error(err);
        await loadData();
      }
    },
    [householdId, progress, loadData]
  );

  const moduleById = useMemo(() => {
    const map: Record<string, Module> = {};
    modules.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [modules]);

  const tasksByLevel = useMemo(
    () =>
      LEVEL_ORDER.map((level) => ({
        level,
        tasks: tasks.filter((t) => t.readinessLevel === level),
      })),
    [tasks]
  );

  return {
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
    setModules,
  };
}
