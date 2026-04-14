export type Alert = {
  id: string;
  severity: "upcoming" | "due" | "overdue";
  category: string;
  entityType: string;
  entityId: string;
  title: string;
  detail?: string | null;
  dueAt?: string | null;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
};
