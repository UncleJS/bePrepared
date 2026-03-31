import { Loader2 } from "lucide-react";

export function LoadingSpinner({
  label = "Loading…",
  className = "py-10",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm text-muted-foreground ${className}`}
    >
      <Loader2 size={16} className="animate-spin" />
      <span>{label}</span>
    </div>
  );
}
