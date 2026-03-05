import type { Equipment, EquipmentForm } from "./types";

export function asNum(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function toForm(item: Equipment): EquipmentForm {
  return {
    name: item.name,
    categoryId: item.categoryId ?? "",
    model: item.model ?? "",
    serialNo: item.serialNo ?? "",
    location: item.location ?? "",
    status: item.status,
    acquiredAt: item.acquiredAt ? item.acquiredAt.slice(0, 10) : "",
    notes: item.notes ?? "",
  };
}
