export type EquipmentCategory = {
  id: string;
  householdId?: string | null;
  isSystem: boolean;
  name: string;
  slug: string;
  sortOrder: number;
};

export type Equipment = {
  id: string;
  name: string;
  model?: string;
  serialNo?: string;
  categoryId?: string | null;
  categorySlug: string;
  status: "operational" | "needs_service" | "unserviceable" | "retired";
  location?: string;
  acquiredAt?: string;
  notes?: string;
};

export type EquipmentForm = {
  name: string;
  categoryId: string;
  model: string;
  serialNo: string;
  location: string;
  status: "operational" | "needs_service" | "unserviceable" | "retired";
  acquiredAt: string;
  notes: string;
};

export type CategoryForm = {
  name: string;
  slug: string;
  sortOrder: string;
};
