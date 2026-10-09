/**
 * Default cap for household-scoped list endpoints.
 * Households that outgrow this should page; the cap exists so one request
 * cannot load an unbounded table into memory.
 */
export const DEFAULT_LIST_LIMIT = 500;

/** Set when a capped list returns exactly the limit (more rows may exist). */
export function markTruncated(
  set: { headers: Record<string, string | number> },
  rowCount: number,
  limit: number = DEFAULT_LIST_LIMIT
): void {
  if (rowCount >= limit) set.headers["x-truncated"] = "true";
}

export function mysqlAffectedRows(result: unknown): number {
  if (Array.isArray(result) && result[0] && typeof result[0] === "object") {
    const header = result[0] as { affectedRows?: number };
    return Number(header.affectedRows ?? 0);
  }
  if (result && typeof result === "object" && "affectedRows" in result) {
    return Number((result as { affectedRows?: number }).affectedRows ?? 0);
  }
  return 0;
}
