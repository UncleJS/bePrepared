"use client";

import { CategoryManager } from "@/components/settings/CategoryManager";

export default function EquipmentCategoriesPage() {
  return (
    <CategoryManager
      title="Equipment Categories"
      categoryPath={(householdId) => `/equipment/${householdId}/categories`}
      itemPath={(householdId) => `/equipment/${householdId}`}
      namePlaceholder="Power"
      slugPlaceholder="power"
      backHref="/settings"
    />
  );
}
