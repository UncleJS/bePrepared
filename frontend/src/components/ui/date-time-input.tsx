"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DateOnlyInput } from "@/components/ui/date-only-input";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const FIVES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** Keep only digits and auto-insert colons: "1330" -> "13:30", "133045" -> "13:30:45". */
export function sanitizeTimeInput(raw: string, withSeconds: boolean) {
  const digits = raw.replace(/\D/g, "").slice(0, withSeconds ? 6 : 4);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;

  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
}

/** Combine the date and time fields into "yyyy-MM-dd HH:mm:ss" (matches MariaDB DATETIME). */
export function composeDateTime(date: string, time: string, withSeconds: boolean) {
  if (!date && !time) return "";
  const [h = "00", m = "00", s = "00"] = time.split(":");
  const pad = (seg: string) => seg.padStart(2, "0");
  const normalized = withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:00`;
  return `${date} ${normalized}`.trim();
}

/** Replace one segment of an "HH:mm:ss" string, defaulting missing segments to "00". */
export function setTimeSegment(
  time: string,
  segment: "hour" | "minute" | "second",
  value: string
) {
  const [h = "00", m = "00", s = "00"] = time.split(":");
  const next = {
    hour: segment === "hour" ? value : h.padStart(2, "0"),
    minute: segment === "minute" ? value : m.padStart(2, "0"),
    second: segment === "second" ? value : s.padStart(2, "0"),
  };
  return `${next.hour}:${next.minute}:${next.second}`;
}

interface DateTimeInputProps {
  /** Combined value: "yyyy-MM-dd HH:mm:ss" (or partial while typing). */
  value: string;
  onChange: (value: string) => void;
  /** Render the seconds grid + segment. Default true (matches DATETIME precision). */
  withSeconds?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

function MatrixGrid({
  label,
  values,
  columns,
  selected,
  onPick,
}: {
  label: string;
  values: string[];
  columns: 4 | 6;
  selected: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold uppercase tracking-wide text-primary">{label}</div>
      <div className={cn("grid gap-1", columns === 6 ? "grid-cols-6" : "grid-cols-4")}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onPick(v)}
            className={cn(
              "rounded px-1.5 py-1 font-mono text-xs transition-colors",
              v === selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateTimeInput({
  value,
  onChange,
  withSeconds = true,
  id,
  name,
  disabled,
  required,
  className,
}: DateTimeInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const spaceIdx = value.indexOf(" ");
  const datePart = spaceIdx === -1 ? value : value.slice(0, spaceIdx);
  const timePart = spaceIdx === -1 ? "" : value.slice(spaceIdx + 1);
  const [hour = "", minute = "", second = ""] = timePart.split(":");

  function emit(date: string, time: string) {
    onChange(date || time ? `${date} ${time}`.trimEnd() : "");
  }

  function pickSegment(segment: "hour" | "minute" | "second", v: string) {
    // Picking keeps the popover open — one session usually sets several segments.
    emit(datePart, setTimeSegment(timePart, segment, v));
  }

  // Close on click outside / Escape.
  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative flex gap-2", className)}>
      <DateOnlyInput
        id={id}
        name={name}
        value={datePart}
        disabled={disabled}
        required={required}
        onChange={(v) => emit(v, timePart)}
        className="flex-1"
      />

      <div className="relative w-32">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={withSeconds ? "HH:mm:ss" : "HH:mm"}
          pattern={withSeconds ? "\\d{2}:\\d{2}:\\d{2}" : "\\d{2}:\\d{2}"}
          maxLength={withSeconds ? 8 : 5}
          value={timePart}
          disabled={disabled}
          onChange={(e) => emit(datePart, sanitizeTimeInput(e.target.value, withSeconds))}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 font-mono text-sm shadow-sm",
            "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "placeholder:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-label="Open time picker"
          aria-expanded={open}
          className="absolute right-0 top-0 inline-flex h-9 w-8 items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        {open ? (
          <div className="absolute right-0 top-10 z-50 w-56 space-y-3 rounded-md border border-border bg-popover p-3 shadow-md">
            <MatrixGrid
              label="Hour"
              values={HOURS}
              columns={6}
              selected={hour}
              onPick={(v) => pickSegment("hour", v)}
            />
            <MatrixGrid
              label="Minute"
              values={FIVES}
              columns={4}
              selected={minute}
              onPick={(v) => pickSegment("minute", v)}
            />
            {withSeconds ? (
              <MatrixGrid
                label="Second"
                values={FIVES}
                columns={4}
                selected={second}
                onPick={(v) => pickSegment("second", v)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
