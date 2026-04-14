import { Pencil } from "lucide-react";
import { daysUntil, fmtDate } from "@/lib/api";
import type { Schedule } from "./types";

export function MaintenanceRow({
  schedule,
  equipmentName,
  onEdit,
}: {
  schedule: Schedule;
  equipmentName: string;
  onEdit: (schedule: Schedule) => void;
}) {
  const days = daysUntil(schedule.nextDueAt);
  let statusLabel = "OK";
  let statusClass = "text-primary";

  if (!schedule.isActive) {
    statusLabel = "Inactive";
    statusClass = "text-muted-foreground";
  } else if (days !== null) {
    if (days < 0) {
      statusLabel = `Overdue ${Math.abs(days)}d`;
      statusClass = "font-semibold text-destructive";
    } else if (days <= schedule.graceDays) {
      statusLabel = `Due in ${days}d`;
      statusClass = "font-medium text-yellow-400";
    } else {
      statusLabel = `${days}d`;
      statusClass = "text-muted-foreground";
    }
  }

  return (
    <tr
      className={`transition-colors hover:bg-accent/30 ${!schedule.isActive ? "opacity-60" : ""}`}
    >
      <td className="px-4 py-2.5 text-muted-foreground">{equipmentName}</td>
      <td className="px-4 py-2.5 font-medium">{schedule.name}</td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {schedule.calDays ? `${schedule.calDays}d` : "—"}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(schedule.lastDoneAt)}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(schedule.nextDueAt)}</td>
      <td className={`px-4 py-2.5 ${statusClass}`}>{statusLabel}</td>
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onEdit(schedule)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Pencil size={12} /> Edit
        </button>
      </td>
    </tr>
  );
}
