import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { fmtDate } from "@/lib/api";
import { Timestamp } from "@/components/ui/Timestamp";
import { ALERT_ENTITY_LINK, ALERT_SEVERITY_BORDER, ALERT_SEVERITY_TEXT } from "./presentation";
import type { Alert } from "./types";

export function AlertRow({
  alert,
  onMarkRead,
  onResolve,
}: {
  alert: Alert;
  onMarkRead: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${ALERT_SEVERITY_BORDER[alert.severity]}`}
    >
      <AlertTriangle
        size={15}
        className={`mt-0.5 shrink-0 ${ALERT_SEVERITY_TEXT[alert.severity]}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{alert.title}</p>
        {alert.detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{alert.detail}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="capitalize">{alert.category.replaceAll("_", " ")}</span>
          {alert.dueAt ? <span>Due: {fmtDate(alert.dueAt)}</span> : null}
          <Timestamp value={alert.createdAt} />
          {alert.isRead ? (
            <span className="rounded border border-border px-1 text-muted-foreground/60">read</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {ALERT_ENTITY_LINK[alert.entityType] ? (
          <Link
            to={ALERT_ENTITY_LINK[alert.entityType]}
            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            View →
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => onMarkRead(alert.id)}
          disabled={alert.isRead}
          className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Read
        </button>
        <button
          type="button"
          onClick={() => onResolve(alert.id)}
          className="rounded border border-primary/30 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10 hover:text-primary"
        >
          Resolve
        </button>
      </div>
    </div>
  );
}
