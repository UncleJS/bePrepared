import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

const runAllJobs = mock(async () => ({
  expiry: { inserted: 1, escalated: 0, skipped: 0, errors: 0 },
  replacement: { inserted: 0, escalated: 0, skipped: 0, errors: 0 },
  maintenance: { inserted: 0, escalated: 0, skipped: 0, errors: 0 },
}));

mock.module("../../lib/alertJobs", () => ({ runAllJobs }));
mock.module("../../lib/routeAuth", () => ({
  requireAdmin: () => ({ sub: "admin-1", isAdmin: true }),
  requireHouseholdScope: () => ({ sub: "admin-1", isAdmin: true, householdId: "household-1" }),
}));
mock.module("../../db/client", () => ({ db: { query: { alerts: { findMany: async () => [] } } } }));

const { alertsRoute, adminAlertsRoute } = await import("./index");

describe("alerts admin run-job routes", () => {
  it("supports the canonical /admin/alerts/run-job route", async () => {
    const app = new Elysia().use(adminAlertsRoute);

    const res = await app.handle(
      new Request("http://localhost/admin/alerts/run-job", { method: "POST" })
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(runAllJobs).toHaveBeenCalledTimes(1);
  });

  it("keeps /alerts/run-job as a compatibility alias", async () => {
    const app = new Elysia().use(alertsRoute);

    const res = await app.handle(
      new Request("http://localhost/alerts/run-job", { method: "POST" })
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(runAllJobs).toHaveBeenCalledTimes(2);
  });
});
