import type { EquipmentForm } from "./types";

export const STATUS_COLORS: Record<string, string> = {
  operational: "text-primary",
  needs_service: "text-yellow-400",
  unserviceable: "text-destructive",
  retired: "text-muted-foreground",
};

export const EMPTY_EQUIPMENT_FORM: EquipmentForm = {
  name: "",
  categoryId: "",
  model: "",
  serialNo: "",
  location: "",
  status: "operational",
  acquiredAt: "",
  notes: "",
};
