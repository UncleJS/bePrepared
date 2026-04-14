import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?:
    | {
        label: string;
        href?: string;
        onClick?: () => void;
      }
    | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
      <Inbox size={28} className="mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action?.href ? (
        <Link
          to={action.href}
          className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {action.label}
        </Link>
      ) : null}
      {action?.onClick ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
