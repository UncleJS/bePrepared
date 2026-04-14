export type InventoryLot = {
  id: string;
  itemId: string;
  qty: number | string;
  acquiredAt?: string;
  expiresAt?: string;
  nextReplaceAt?: string;
  replaceDays?: number | null;
  batchRef?: string;
  notes?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit?: string;
  location?: string;
  categoryId?: string;
  targetQty?: number | string;
  lowStockThreshold?: number | string;
  isTrackedByExpiry: boolean;
  notes?: string;
  lots: InventoryLot[];
};

export type InventoryCategory = {
  id: string;
  householdId?: string | null;
  isSystem: boolean;
  name: string;
  slug: string;
  sortOrder: number;
};

export type ItemForm = {
  name: string;
  unit: string;
  location: string;
  categoryId: string;
  targetQty: string;
  lowStockThreshold: string;
  isTrackedByExpiry: boolean;
  initialLotQty: string;
  initialAcquiredAt: string;
  initialExpiresAt: string;
  notes: string;
};

export type LotForm = {
  qty: string;
  acquiredAt: string;
  expiresAt: string;
  replaceDays: string;
  batchRef: string;
  notes: string;
};
