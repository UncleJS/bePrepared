export type CategoryAccessShape = {
  householdId: string | null;
  isSystem: boolean;
  archivedAt: Date | null;
};

export function isAllowedCategoryForHousehold(
  category: CategoryAccessShape | null | undefined,
  householdId: string
): boolean {
  if (!category || category.archivedAt) return false;
  return category.isSystem || category.householdId === householdId;
}

export function isCustomCategoryForHousehold(
  category: CategoryAccessShape | null | undefined,
  householdId: string
): boolean {
  if (!category || category.archivedAt) return false;
  return !category.isSystem && category.householdId === householdId;
}
