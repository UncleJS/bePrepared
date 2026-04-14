import { useMemo, type Dispatch, type SetStateAction } from "react";
import { LEVEL_LABELS, LEVEL_ORDER, SCENARIOS, TASK_CLASSES } from "./constants";
import type { Module, TaskForm } from "./types";

export function TaskFormFields({
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
          onChange={(e) =>
            setForm((prev) => ({ ...prev, moduleId: e.target.value, sectionId: "" }))
          }
        >
          <option value="">Select module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
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
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
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
          {TASK_CLASSES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Readiness Level</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.readinessLevel}
          onChange={(e) => setForm((prev) => ({ ...prev, readinessLevel: e.target.value }))}
        >
          {LEVEL_ORDER.map((v) => (
            <option key={v} value={v}>
              {LEVEL_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide">Scenario</label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.scenario}
          onChange={(e) => setForm((prev) => ({ ...prev, scenario: e.target.value }))}
        >
          {SCENARIOS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
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
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              isRecurring: e.target.checked,
              recurDays: e.target.checked ? prev.recurDays : "",
            }))
          }
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
