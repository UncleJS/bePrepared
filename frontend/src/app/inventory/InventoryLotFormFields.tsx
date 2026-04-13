import type { Dispatch, SetStateAction } from "react";
import type { LotForm } from "./types";
import { DateOnlyInput } from "@/components/ui/date-only-input";

export function InventoryLotFormFields({
  form,
  setForm,
}: {
  form: LotForm;
  setForm: Dispatch<SetStateAction<LotForm>>;
}) {
  return (
    <>
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Lot Quantity *
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.qty}
          onChange={(e) => setForm((prev) => ({ ...prev, qty: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Lot Acquired Date
        </label>
        <DateOnlyInput
          value={form.acquiredAt}
          onChange={(v) => setForm((prev) => ({ ...prev, acquiredAt: v }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Lot Expiry Date
        </label>
        <DateOnlyInput
          value={form.expiresAt}
          onChange={(v) => setForm((prev) => ({ ...prev, expiresAt: v }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Replace Interval (days)
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.replaceDays}
          onChange={(e) => setForm((prev) => ({ ...prev, replaceDays: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Batch Reference
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.batchRef}
          onChange={(e) => setForm((prev) => ({ ...prev, batchRef: e.target.value }))}
        />
      </div>
    </>
  );
}
