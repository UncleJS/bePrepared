import { beforeEach, describe, expect, it, mock } from "bun:test";

const updates: { id: string; values: Record<string, unknown> }[] = [];
let activeAlerts: Array<{ id: string; entityId: string }> = [];

const db = {
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        const id = (values as { _id?: string })._id;
        updates.push({ id: String(id ?? "unknown"), values });
      },
    }),
  }),
  query: {
    alerts: {
      findMany: async () => activeAlerts,
    },
  },
};

// Capture alert id from where(eq(alerts.id, row.id)) — drizzle where is opaque,
// so override update to record from the row we resolve in the loop by wrapping.
mock.module("../db/client", () => ({
  pool: {
    getConnection: async () => ({
      query: async () => [[{ got: 1 }]],
      release: () => undefined,
    }),
  },
  db: {
    ...db,
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async (_cond: unknown) => {
          updates.push({ id: "resolved", values });
        },
      }),
    }),
  },
}));

const { resolveStaleAlerts } = await import("./alertJobs");

describe("resolveStaleAlerts", () => {
  beforeEach(() => {
    updates.length = 0;
    activeAlerts = [
      { id: "a-live", entityId: "lot-1" },
      { id: "a-stale", entityId: "lot-gone" },
    ];
  });

  it("resolves alerts whose entity is no longer a live candidate", async () => {
    const metrics = { inserted: 0, escalated: 0, skipped: 0, errors: 0 };
    await resolveStaleAlerts("expiry", "inventory_lot", new Set(["lot-1"]), metrics);
    expect(metrics.skipped).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.values.isResolved).toBe(true);
  });

  it("leaves live-entity alerts alone", async () => {
    activeAlerts = [{ id: "a-live", entityId: "lot-1" }];
    const metrics = { inserted: 0, escalated: 0, skipped: 0, errors: 0 };
    await resolveStaleAlerts("expiry", "inventory_lot", new Set(["lot-1"]), metrics);
    expect(metrics.skipped).toBe(0);
    expect(updates).toHaveLength(0);
  });
});
