import type { Task, TaskForm } from "./types";

export function toForm(task: Task): TaskForm {
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

export function toPayload(form: TaskForm) {
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
