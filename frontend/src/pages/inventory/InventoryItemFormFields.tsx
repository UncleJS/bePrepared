import { useId, type Dispatch, type SetStateAction } from "react";
import type { InventoryCategory, ItemForm } from "./types";
import { DateOnlyInput } from "@/components/ui/date-only-input";

export function InventoryItemFormFields({
  form,
  setForm,
  categories,
  includeInitialLot = true,
}: {
  form: ItemForm;
  setForm: Dispatch<SetStateAction<ItemForm>>;
  categories: InventoryCategory[];
  includeInitialLot?: boolean;
}) {
  const fieldId = useId();
  return (
    <>
      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-name`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Item Name *
        </label>
        <input
          id={`${fieldId}-name`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-unit`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Unit
        </label>
        <input
          id={`${fieldId}-unit`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.unit}
          onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-location`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Storage Location
        </label>
        <input
          id={`${fieldId}-location`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.location}
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-category`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Item Category
        </label>
        <select
          id={`${fieldId}-category`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.categoryId}
          onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
        >
          <option value="">Optional</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-target`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Target Quantity
        </label>
        <input
          id={`${fieldId}-target`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.targetQty}
          onChange={(e) => setForm((prev) => ({ ...prev, targetQty: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${fieldId}-low`}
          className="block text-xs font-bold uppercase tracking-wide text-primary"
        >
          Low-Stock Threshold
        </label>
        <input
          id={`${fieldId}-low`}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.lowStockThreshold}
          onChange={(e) => setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Expiry Tracking
        </label>
        <label
          htmlFor={`${fieldId}-expiry`}
          className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm"
        >
          <input
            id={`${fieldId}-expiry`}
            type="checkbox"
            checked={form.isTrackedByExpiry}
            onChange={(e) => setForm((prev) => ({ ...prev, isTrackedByExpiry: e.target.checked }))}
          />
          Track by expiry
        </label>
      </div>

      {includeInitialLot && (
        <>
          <div className="space-y-1">
            <label
              htmlFor={`${fieldId}-lot-qty`}
              className="block text-xs font-bold uppercase tracking-wide text-primary"
            >
              Initial Lot Quantity
            </label>
            <input
              id={`${fieldId}-lot-qty`}
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={form.initialLotQty}
              onChange={(e) => setForm((prev) => ({ ...prev, initialLotQty: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`${fieldId}-acquired`}
              className="block text-xs font-bold uppercase tracking-wide text-primary"
            >
              Initial Acquired Date
            </label>
            <DateOnlyInput
              id={`${fieldId}-acquired`}
              value={form.initialAcquiredAt}
              onChange={(v) => setForm((prev) => ({ ...prev, initialAcquiredAt: v }))}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`${fieldId}-expires`}
              className="block text-xs font-bold uppercase tracking-wide text-primary"
            >
              Initial Expiry Date
            </label>
            <DateOnlyInput
              id={`${fieldId}-expires`}
              value={form.initialExpiresAt}
              onChange={(v) => setForm((prev) => ({ ...prev, initialExpiresAt: v }))}
            />
          </div>
        </>
      )}
    </>
  );
}
