/**
 * Active-alert identity shared by the generated column in migration 0010
 * and the upsert lookup. Expiry and replacement for the same lot must differ.
 */
export function buildActiveAlertKey(input: {
  householdId: string;
  category: string;
  entityType: string;
  entityId: string;
  isActive: boolean;
  id: string;
}): string {
  const base = `${input.householdId}:${input.category}:${input.entityType}:${input.entityId}`;
  return input.isActive ? base : `${base}:${input.id}`;
}
