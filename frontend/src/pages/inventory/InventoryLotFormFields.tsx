import { useId, type Dispatch, type SetStateAction } from "react";
import type { LotForm } from "./types";
import { DateOnlyInput } from "@/components/ui/date-only-input";

export function InventoryLotFormFields({
  form,
  setForm,
}: {
  form: LotForm;
  setForm: Dispatch<SetStateAction<LotForm>>;
}) {
  const fieldId = useId();
  return (
    <>
      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-qty`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Lot Quantity *
        </label>
        <input
          id={`${fieldId}-qty`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.qty}
          onChange={(e) => setForm((prev) => ({ ...prev, qty: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-acquired`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Lot Acquired Date
        </label>
        <DateOnlyInput
          id={`${fieldId}-acquired`}
          value={form.acquiredAt}
          onChange={(v) => setForm((prev) => ({ ...prev, acquiredAt: v }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-expires`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Lot Expiry Date
        </label>
        <DateOnlyInput
          id={`${fieldId}-expires`}
          value={form.expiresAt}
          onChange={(v) => setForm((prev) => ({ ...prev, expiresAt: v }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-replace`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Replace Interval (days)
        </label>
        <input
          id={`${fieldId}-replace`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.replaceDays}
          onChange={(e) => setForm((prev) => ({ ...prev, replaceDays: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-batch`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Batch Reference
        </label>
        <input
          id={`${fieldId}-batch`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.batchRef}
          onChange={(e) => setForm((prev) => ({ ...prev, batchRef: e.target.value }))}
        />
      </div>
    </>
  );
}
