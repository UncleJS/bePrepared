import type { Dispatch, SetStateAction } from "react";
import type { EquipmentCategory, EquipmentForm } from "./types";

export function EquipmentFormFields({
  form,
  setForm,
  categories,
}: {
  form: EquipmentForm;
  setForm: Dispatch<SetStateAction<EquipmentForm>>;
  categories: EquipmentCategory[];
}) {
  return (
    <>
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Equipment Name *
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Equipment Category
        </label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.categoryId}
          onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">Model</label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.model}
          onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Serial Number
        </label>
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.serialNo}
          onChange={(e) => setForm((prev) => ({ ...prev, serialNo: e.target.value }))}
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
          Operational Status
        </label>
        <select
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.status}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, status: e.target.value as EquipmentForm["status"] }))
          }
        >
          <option value="operational">Operational</option>
          <option value="needs_service">Needs service</option>
          <option value="unserviceable">Unserviceable</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Acquired Date
        </label>
        <input
          type="date"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          value={form.acquiredAt}
          onChange={(e) => setForm((prev) => ({ ...prev, acquiredAt: e.target.value }))}
        />
      </div>
    </>
  );
}
