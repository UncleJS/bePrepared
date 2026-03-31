import { AlertTriangle } from "lucide-react";

export function ErrorBanner({ message, retry }: { message: string; retry?: (() => void) | null }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>{message}</p>
      </div>
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="shrink-0 rounded-md border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
