export type CategoryAccessShape = {
  householdId: string | null;
  isSystem: boolean;
  archivedAt: Date | null;
};

type MutableSetStatus = { status?: number | string };

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

export function requireCustomCategoryForHousehold(
  category: CategoryAccessShape | null | undefined,
  householdId: string,
  set: MutableSetStatus,
  notFoundMessage = "Custom category not found"
): boolean {
  if (isCustomCategoryForHousehold(category, householdId)) {
    return true;
  }
  set.status = 404;
  return false;
}

export function requireAllowedCategoryForHousehold(
  category: CategoryAccessShape | null | undefined,
  householdId: string,
  set: MutableSetStatus,
  invalidMessage = "Invalid category for household"
): boolean {
  if (isAllowedCategoryForHousehold(category, householdId)) {
    return true;
  }
  set.status = 400;
  return false;
}

export function validateCategoryReplacementInput(
  replacementCategoryId: string | undefined,
  archivedCategoryId: string,
  set: MutableSetStatus
): { ok: true } | { ok: false; error: string } {
  if (!replacementCategoryId) {
    return { ok: true };
  }
  if (replacementCategoryId === archivedCategoryId) {
    set.status = 400;
    return { ok: false, error: "replacementCategoryId must be different from archived category" };
  }
  return { ok: true };
}
