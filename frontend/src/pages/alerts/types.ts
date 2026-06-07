export type Alert = {
  id: string;
  severity: "upcoming" | "due" | "overdue";
  category: string;
  entityType: string;
  entityId: string;
  title: string;
  detail?: string | null;
  dueAtUTC?: string | null;
  isRead: boolean;
  isResolved: boolean;
  createdAtUTC: string;
};
