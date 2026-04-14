import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/pages/tasks/constants";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTasksData } from "@/pages/tasks/useTasksData";

export default function DashboardTasks({ householdId }: { householdId: string }) {
  const { tasks, progress, moduleById, loadData, loading } = useTasksData(householdId);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const nextTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => progress[task.id]?.status !== "completed")
      .sort((a, b) => {
        const levelDiff =
          LEVEL_ORDER.indexOf(a.readinessLevel) - LEVEL_ORDER.indexOf(b.readinessLevel);
        if (levelDiff !== 0) return levelDiff;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      })
      .slice(0, 6);
  }, [tasks, progress]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Next tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The next incomplete actions keeping the household moving forward.
          </p>
        </div>
        <Link to="/tasks" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>

      <div className="mt-4">
        {!loading && nextTasks.length === 0 ? (
          <EmptyState
            title="No pending tasks"
            description="Current tasks are complete for the active household."
          />
        ) : (
          <div className="space-y-2">
            {nextTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {LEVEL_LABELS[task.readinessLevel] ?? task.readinessLevel}
                  </span>
                  <span>{moduleById[task.moduleId]?.title ?? "Module"}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{task.title}</p>
                {task.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
