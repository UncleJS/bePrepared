import { useId, useMemo, type Dispatch, type SetStateAction } from "react";
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
  const fieldId = useId();
  const sections = useMemo(
    () => modules.find((m) => m.id === form.moduleId)?.sections ?? [],
    [modules, form.moduleId]
  );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="space-y-1 md:col-span-2">
        <label
          htmlFor={`${fieldId}-title`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Task Title *
        </label>
        <input
          id={`${fieldId}-title`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-sort`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Sort Order
        </label>
        <input
          id={`${fieldId}-sort`}
          type="number"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.sortOrder}
          onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-module`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Module *
        </label>
        <select
          id={`${fieldId}-module`}
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
        <label
          htmlFor={`${fieldId}-section`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Section
        </label>
        <select
          id={`${fieldId}-section`}
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
        <label
          htmlFor={`${fieldId}-class`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Task Class
        </label>
        <select
          id={`${fieldId}-class`}
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
        <label
          htmlFor={`${fieldId}-level`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Readiness Level
        </label>
        <select
          id={`${fieldId}-level`}
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
        <label
          htmlFor={`${fieldId}-scenario`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Scenario
        </label>
        <select
          id={`${fieldId}-scenario`}
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
        <label
          htmlFor={`${fieldId}-description`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Description
        </label>
        <textarea
          id={`${fieldId}-description`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-1 md:col-span-3">
        <label
          htmlFor={`${fieldId}-evidence`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Evidence Prompt
        </label>
        <input
          id={`${fieldId}-evidence`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.evidencePrompt}
          onChange={(e) => setForm((prev) => ({ ...prev, evidencePrompt: e.target.value }))}
        />
      </div>

      <label
        htmlFor={`${fieldId}-recurring`}
        className="inline-flex items-center gap-2 text-sm md:col-span-1"
      >
        <input
          id={`${fieldId}-recurring`}
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
        <label
          htmlFor={`${fieldId}-recur`}
          className="block text-xs font-bold uppercase tracking-wide"
        >
          Recur Days
        </label>
        <input
          id={`${fieldId}-recur`}
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
