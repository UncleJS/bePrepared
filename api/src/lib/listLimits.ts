/**
 * Default cap for household-scoped list endpoints (alerts, inventory, audit).
 * Households that outgrow this should page; the cap exists so one request
 * cannot load an unbounded table into memory.
 */
export const DEFAULT_LIST_LIMIT = 500;
