import type { ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "outline";
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
        variant === "outline"
          ? "border border-border text-muted-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </span>
  );
}
