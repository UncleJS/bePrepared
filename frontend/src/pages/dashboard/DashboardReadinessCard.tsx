"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/app/tasks/constants";
import { useTasksData } from "@/app/tasks/useTasksData";

export default function DashboardReadinessCard({ householdId }: { householdId: string }) {
  const { tasks, progress, loading, loadData } = useTasksData(householdId);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const completedCount = tasks.filter((task) => progress[task.id]?.status === "completed").length;
  const overallPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Readiness score</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Task completion across 72h, 14d, 30d, and 90d horizons.
          </p>
        </div>
        <Link href="/tasks" className="text-xs text-primary hover:underline">
          Open tasks →
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex justify-center lg:w-48">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${overallPercent}%, hsl(var(--muted)) 0%)`,
            }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-card text-center">
              <span className="text-3xl font-bold">{loading ? "—" : `${overallPercent}%`}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">overall</span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {LEVEL_ORDER.map((level) => {
            const levelTasks = tasks.filter((task) => task.readinessLevel === level);
            const complete = levelTasks.filter(
              (task) => progress[task.id]?.status === "completed"
            ).length;
            const percent =
              levelTasks.length === 0 ? 0 : Math.round((complete / levelTasks.length) * 100);

            return (
              <div key={level} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{LEVEL_LABELS[level] ?? level}</span>
                  <span className="text-muted-foreground">
                    {complete}/{levelTasks.length || 0}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
