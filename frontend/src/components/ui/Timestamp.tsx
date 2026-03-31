import { fmtTs } from "@/lib/api";

export function Timestamp({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return <span className={className ?? "text-muted-foreground"}>—</span>;

  const date = new Date(value);

  return (
    <time
      dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}
      className={className ?? "font-mono text-xs text-muted-foreground"}
    >
      {fmtTs(value)}
    </time>
  );
}
