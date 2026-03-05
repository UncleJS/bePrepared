import type { InventoryItem, InventoryLot, ItemForm, LotForm } from "./types";

export function asNumberOrUndef(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function itemToForm(item: InventoryItem): ItemForm {
  return {
    name: item.name,
    unit: item.unit ?? "",
    location: item.location ?? "",
    categoryId: item.categoryId ?? "",
    targetQty: item.targetQty != null ? String(item.targetQty) : "",
    lowStockThreshold: item.lowStockThreshold != null ? String(item.lowStockThreshold) : "",
    isTrackedByExpiry: item.isTrackedByExpiry,
    initialLotQty: "",
    initialAcquiredAt: "",
    initialExpiresAt: "",
    notes: item.notes ?? "",
  };
}

export function lotToForm(lot: InventoryLot): LotForm {
  return {
    qty: String(lot.qty ?? ""),
    acquiredAt: lot.acquiredAt ? lot.acquiredAt.slice(0, 10) : "",
    expiresAt: lot.expiresAt ? lot.expiresAt.slice(0, 10) : "",
    replaceDays: lot.replaceDays != null ? String(lot.replaceDays) : "",
    batchRef: lot.batchRef ?? "",
    notes: lot.notes ?? "",
  };
}
