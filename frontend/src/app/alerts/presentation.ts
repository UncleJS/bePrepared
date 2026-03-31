export const ALERT_ENTITY_LINK: Record<string, string> = {
  inventory_lot: "/supplies?tab=inventory",
  maintenance_schedule: "/maintenance",
};

export const ALERT_SEVERITY_LABEL: Record<string, string> = {
  overdue: "Overdue",
  due: "Due",
  upcoming: "Upcoming",
};

export const ALERT_SEVERITY_BORDER: Record<string, string> = {
  overdue: "border-destructive/40 bg-destructive/10",
  due: "border-yellow-600/40 bg-yellow-900/15",
  upcoming: "border-border bg-card",
};

export const ALERT_SEVERITY_TEXT: Record<string, string> = {
  overdue: "text-destructive",
  due: "text-yellow-400",
  upcoming: "text-blue-400",
};
