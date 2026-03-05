"use client";

import { CategoryManager } from "@/components/settings/CategoryManager";

export default function InventoryCategoriesPage() {
  return (
    <CategoryManager
      title="Inventory Categories"
      categoryPath={(householdId) => `/inventory/${householdId}/categories`}
      itemPath={(householdId) => `/inventory/${householdId}/items`}
      namePlaceholder="Water"
      slugPlaceholder="water"
    />
  );
}
