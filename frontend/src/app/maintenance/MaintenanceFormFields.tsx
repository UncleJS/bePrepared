import type { EquipmentItem, Template } from "./types";

type MaintenanceFormValue = {
  equipmentItemId?: string;
  templateId?: string;
  name: string;
  calDays: string;
  graceDays: string;
  nextDueAt: string;
  lastDoneAt?: string;
  isActive?: boolean;
};

export function MaintenanceFormFields<T extends MaintenanceFormValue>({
  form,
  setForm,
  equipment = [],
  templates = [],
  showEquipment = false,
  showTemplate = false,
  showLastDone = false,
  showActive = false,
  onTemplateChange,
}: {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  equipment?: EquipmentItem[];
  templates?: Template[];
  showEquipment?: boolean;
  showTemplate?: boolean;
  showLastDone?: boolean;
  showActive?: boolean;
  onTemplateChange?: (templateId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {showEquipment ? (
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Equipment Item
          </label>
          <select
            value={form.equipmentItemId ?? ""}
            onChange={(e) =>
              setForm((current) => ({ ...current, equipmentItemId: e.target.value }))
            }
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          >
            <option value="">Select equipment</option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showTemplate ? (
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Maintenance Template
          </label>
          <select
            value={form.templateId ?? ""}
            onChange={(e) => onTemplateChange?.(e.target.value)}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          >
            <option value="">Select template (optional)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Schedule Name
        </label>
        <input
          value={form.name}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          placeholder="Filter change"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Interval (days)
        </label>
        <input
          value={form.calDays}
          onChange={(e) => setForm((current) => ({ ...current, calDays: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          placeholder="30"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Grace Period (days)
        </label>
        <input
          value={form.graceDays}
          onChange={(e) => setForm((current) => ({ ...current, graceDays: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          placeholder="7"
        />
      </div>

      {showLastDone ? (
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Last Done Date
          </label>
          <input
            type="date"
            value={form.lastDoneAt ?? ""}
            onChange={(e) => setForm((current) => ({ ...current, lastDoneAt: e.target.value }))}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wide text-primary">
          Next Due Date
        </label>
        <input
          type="date"
          value={form.nextDueAt}
          onChange={(e) => setForm((current) => ({ ...current, nextDueAt: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
        />
      </div>

      {showActive ? (
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-primary">
            Active
          </label>
          <div className="flex h-[38px] items-center">
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(form.isActive)}
              onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="ml-2 text-sm text-muted-foreground">
              {form.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
