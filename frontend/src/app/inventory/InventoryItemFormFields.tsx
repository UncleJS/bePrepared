import type { Dispatch, SetStateAction } from "react";
import type { InventoryCategory, ItemForm } from "./types";

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
  return (
    <>
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Item Name *
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">Unit</label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.unit}
          onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Storage Location
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.location}
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Item Category
        </label>
        <select
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
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Target Quantity
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.targetQty}
          onChange={(e) => setForm((prev) => ({ ...prev, targetQty: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Low-Stock Threshold
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.lowStockThreshold}
          onChange={(e) => setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Expiry Tracking
        </label>
        <label className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
          <input
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
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Initial Lot Quantity
            </label>
            <input
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={form.initialLotQty}
              onChange={(e) => setForm((prev) => ({ ...prev, initialLotQty: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Initial Acquired Date
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={form.initialAcquiredAt}
              onChange={(e) => setForm((prev) => ({ ...prev, initialAcquiredAt: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wide text-primary">
              Initial Expiry Date
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
              value={form.initialExpiresAt}
              onChange={(e) => setForm((prev) => ({ ...prev, initialExpiresAt: e.target.value }))}
            />
          </div>
        </>
      )}
    </>
  );
}
