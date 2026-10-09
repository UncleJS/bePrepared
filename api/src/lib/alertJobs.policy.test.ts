import { beforeEach, describe, expect, it, mock } from "bun:test";

const updates: Record<string, unknown>[] = [];
let existingSeverity: "upcoming" | "due" | "overdue" = "upcoming";

const duplicate = Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });

const db = {
  insert: () => ({
    values: async () => {
      throw duplicate;
    },
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        updates.push(values);
      },
    }),
  }),
  query: {
    householdPolicies: { findMany: async () => [] },
    policyDefaults: { findMany: async () => [] },
    alerts: {
      findFirst: async () => ({ id: "alert-1", severity: existingSeverity }),
    },
  },
};

mock.module("../db/client", () => ({ db }));

const { getAlertPolicyForHousehold, upsertAlert } = await import("./alertJobs");

describe("alert policy and upsert refresh", () => {
  beforeEach(() => {
    updates.length = 0;
    existingSeverity = "upcoming";
  });

  it("uses a 3-day grace fallback when no policy rows exist", async () => {
    const policy = await getAlertPolicyForHousehold("household-1");
    expect(policy.graceDays).toBe(3);
    expect(policy.upcomingDays).toBe(14);
  });

  it("refreshes dueAtUTC when an existing alert is unchanged", async () => {
    const dueAtUTC = new Date("2026-11-01T00:00:00.000Z");
    const result = await upsertAlert({
      householdId: "household-1",
      severity: "upcoming",
      category: "expiry",
      entityType: "inventory_lot",
      entityId: "lot-1",
      title: "Lot expiring",
      dueAtUTC,
    });
    expect(result).toBe("unchanged");
    expect(updates[0]?.dueAtUTC).toEqual(dueAtUTC);
  });

  it("refreshes dueAtUTC when an existing alert escalates", async () => {
    existingSeverity = "upcoming";
    const dueAtUTC = new Date("2026-10-01T00:00:00.000Z");
    const result = await upsertAlert({
      householdId: "household-1",
      severity: "overdue",
      category: "expiry",
      entityType: "inventory_lot",
      entityId: "lot-1",
      title: "Lot expiring",
      dueAtUTC,
    });
    expect(result).toBe("escalated");
    expect(updates[0]?.dueAtUTC).toEqual(dueAtUTC);
    expect(updates[0]?.severity).toBe("overdue");
  });
});
