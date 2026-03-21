export type AlertSeverity = "upcoming" | "due" | "overdue";
export type AlertUpsertResult = "inserted" | "escalated" | "unchanged";

const severityRank: Record<AlertSeverity, number> = {
  upcoming: 0,
  due: 1,
  overdue: 2,
};

export function computeAlertSeverity(
  dueAt: Date,
  today: Date = new Date(),
  graceDays: number = 0
): AlertSeverity {
  const due = dueAt.toISOString().slice(0, 10);
  const now = today.toISOString().slice(0, 10);

  if (due > now) return "upcoming";
  if (due === now) return "due";

  if (graceDays > 0) {
    const graceEnd = new Date(dueAt);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    if (now <= graceEnd.toISOString().slice(0, 10)) return "due";
  }

  return "overdue";
}

export function shouldEscalateSeverity(current: AlertSeverity, incoming: AlertSeverity): boolean {
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
