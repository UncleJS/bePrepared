import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import path from "path";
import { buildActiveAlertKey } from "./alertKey";

const LOT = "11111111-1111-1111-1111-111111111111";
const HOUSEHOLD = "00000000-0000-0000-0000-000000000001";

describe("active alert key", () => {
  it("keeps expiry and replacement alerts for the same lot distinct", () => {
    const expiry = buildActiveAlertKey({
      householdId: HOUSEHOLD,
      category: "expiry",
      entityType: "inventory_lot",
      entityId: LOT,
      isActive: true,
      id: "alert-expiry",
    });
    const replacement = buildActiveAlertKey({
      householdId: HOUSEHOLD,
      category: "replacement",
      entityType: "inventory_lot",
      entityId: LOT,
      isActive: true,
      id: "alert-replacement",
    });

    expect(expiry).not.toBe(replacement);
    expect(expiry).toBe(`${HOUSEHOLD}:expiry:inventory_lot:${LOT}`);
    expect(replacement).toBe(`${HOUSEHOLD}:replacement:inventory_lot:${LOT}`);
  });

  it("matches the generated column expression in migration 0010", () => {
    const sql = readFileSync(
      path.join(import.meta.dir, "../db/migrations/0010_alerts_active_key_category.sql"),
      "utf8"
    );
    expect(sql).toContain(
      "CONCAT(`household_id`, ':', `category`, ':', `entity_type`, ':', `entity_id`)"
    );
  });
});
