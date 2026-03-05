import type { ItemForm, LotForm } from "./types";

export const EMPTY_ITEM_FORM: ItemForm = {
  name: "",
  unit: "",
  location: "",
  categoryId: "",
  targetQty: "",
  lowStockThreshold: "",
  isTrackedByExpiry: true,
  initialLotQty: "",
  initialAcquiredAt: "",
  initialExpiresAt: "",
  notes: "",
};

export const EMPTY_LOT_FORM: LotForm = {
  qty: "",
  acquiredAt: "",
  expiresAt: "",
  replaceDays: "",
  batchRef: "",
  notes: "",
};
