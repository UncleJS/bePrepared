"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useActiveHouseholdId } from "@/lib/useActiveHouseholdId";
import { CheckSquare, Square, ChevronDown, ChevronRight } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string;
  taskClass: string;
  readinessLevel: string;
  scenario: string;
  moduleId: string;
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

export default function TasksPage() {
  const { householdId, status } = useActiveHouseholdId();

  const [tasks, setTasks]       = useState<Task[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ l1_72h: true });

  useEffect(() => {
    if (!householdId) return;

    Promise.all([
      apiFetch<Task[]>("/tasks"),
      apiFetch<Progress[]>(`/tasks/${householdId}/progress`),
    ]).then(([t, p]) => {
      const deduped = new Map<string, Task>();
      for (const task of t) {
        const key = `${task.moduleId}:${task.readinessLevel}:${task.scenario}:${task.title.trim().toLowerCase()}`;
        if (!deduped.has(key)) deduped.set(key, task);
      }
      setTasks(Array.from(deduped.values()));
      const map: Record<string, Progress> = {};
      p.forEach((pr) => { map[pr.taskId] = pr; });
      setProgress(map);
    }).catch(console.error).finally(() => setLoading(false));
  }, [householdId]);

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

  const byLevel = LEVEL_ORDER.map((lvl) => ({
    level: lvl,
    tasks: tasks.filter((t) => t.readinessLevel === lvl),
  }));

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
                  return (
                    <li key={task.id}>
                      <button
                        onClick={() => toggle(task)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
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
                          <div className="flex gap-2 mt-1">
                            <Badge>{task.taskClass}</Badge>
                            {task.scenario !== "both" && <Badge variant="outline">{task.scenario}</Badge>}
                          </div>
                        </div>
                      </button>
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

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "outline" }) {
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
