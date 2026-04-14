import type { TaskForm } from "./types";

export const LEVEL_LABELS: Record<string, string> = {
  l1_72h: "Level 1 - 72 Hours",
  l2_14d: "Level 2 - 14 Days",
  l3_30d: "Level 3 - 30 Days",
  l4_90d: "Level 4 - 90 Days",
};

export const LEVEL_ORDER = ["l1_72h", "l2_14d", "l3_30d", "l4_90d"];

export const TASK_CLASSES = ["acquire", "prepare", "test", "maintain", "document"] as const;
export const SCENARIOS = ["both", "shelter_in_place", "evacuation"] as const;

export const EMPTY_FORM: TaskForm = {
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
