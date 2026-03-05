export type AlertSeverity = "upcoming" | "due" | "overdue";
export type AlertUpsertResult = "inserted" | "escalated" | "unchanged";

const severityRank: Record<AlertSeverity, number> = {
  upcoming: 0,
  due: 1,
  overdue: 2,
};

export function computeAlertSeverity(dueAt: Date, today: Date = new Date()): AlertSeverity {
  const due = dueAt.toISOString().slice(0, 10);
  const now = today.toISOString().slice(0, 10);

  if (due < now) return "overdue";
  if (due === now) return "due";
  return "upcoming";
}

export function shouldEscalateSeverity(
  current: AlertSeverity,
  incoming: AlertSeverity
): boolean {
  return severityRank[incoming] > severityRank[current];
}

export function resolveAlertUpsertResult(
  existing: AlertSeverity | null,
  incoming: AlertSeverity
): AlertUpsertResult {
  if (!existing) return "inserted";
  if (shouldEscalateSeverity(existing, incoming)) return "escalated";
  return "unchanged";
}
