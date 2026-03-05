export type Task = {
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

export type Module = {
  id: string;
  title: string;
  sections: { id: string; title: string }[];
};

export type Progress = {
  id: string;
  taskId: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  completedAt?: string;
  evidenceNote?: string;
};

export type TaskForm = {
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
