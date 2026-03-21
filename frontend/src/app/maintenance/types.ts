export type Schedule = {
  id: string;
  equipmentItemId: string;
  name: string;
  calDays?: number;
  nextDueAt?: string;
  lastDoneAt?: string;
  graceDays: number;
  isActive: boolean;
};

export type ScheduleEditForm = {
  name: string;
  calDays: string;
  graceDays: string;
  nextDueAt: string;
  lastDoneAt: string;
  isActive: boolean;
};

export type EquipmentItem = { id: string; name: string; categorySlug?: string };
export type Template = { id: string; name: string; defaultCalDays?: number; graceDays?: number };

export const EMPTY_EDIT_FORM: ScheduleEditForm = {
  name: "",
  calDays: "",
  graceDays: "7",
  nextDueAt: "",
  lastDoneAt: "",
  isActive: true,
};

export function scheduleToForm(schedule: Schedule): ScheduleEditForm {
  return {
    name: schedule.name,
    calDays: schedule.calDays != null ? String(schedule.calDays) : "",
    graceDays: String(schedule.graceDays),
    nextDueAt: schedule.nextDueAt ? schedule.nextDueAt.slice(0, 10) : "",
    lastDoneAt: schedule.lastDoneAt ? schedule.lastDoneAt.slice(0, 10) : "",
    isActive: schedule.isActive,
  };
}
