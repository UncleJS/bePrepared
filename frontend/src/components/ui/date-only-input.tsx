"use client";

import { CalendarDays } from "lucide-react";
import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface DateOnlyInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

function sanitizeDateOnlyInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function DateOnlyInput({
  value,
  onChange,
  id,
  name,
  disabled,
  required,
  className,
}: DateOnlyInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const pickerRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!picker) return;

    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }

    picker.focus();
    picker.click();
  }

  return (
    <div className={cn("relative", className)}>
      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="yyyy-mm-dd"
        pattern="\d{4}-\d{2}-\d{2}"
        maxLength={10}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(sanitizeDateOnlyInput(e.target.value))}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-10 font-mono text-sm shadow-sm",
          "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />

      <button
        type="button"
        onClick={openPicker}
        aria-label="Open date picker"
        className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center text-muted-foreground"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {/* Hidden native picker — only used to open the browser calendar via the button above */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-2 top-2 h-5 w-5 opacity-0"
      />
    </div>
  );
}
