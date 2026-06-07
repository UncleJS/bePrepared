import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

// Track whether findFirst should behave as "active row exists" or "archived/missing"
let activeRow: Record<string, unknown> | null = null;

const updateWhere = mock(async () => undefined);

mock.module("../../lib/routeAuth", () => ({
  requireAuth: () => ({ sub: "admin-1", isAdmin: true }),
  requireAdmin: () => ({ sub: "admin-1", isAdmin: true }),
  requireHouseholdScope: () => ({ sub: "admin-1", isAdmin: true, householdId: "household-1" }),
}));
mock.module("../../db/client", () => ({
  db: {
    update: () => ({ set: () => ({ where: updateWhere }) }),
    query: {
      households: {
        findFirst: async () => activeRow,
      },
    },
  },
}));

const { householdsRoute } = await import("./index");

describe("households PATCH archive handling", () => {
  it("returns the updated row for an active household", async () => {
    activeRow = { id: "household-1", name: "Updated" };
    const app = new Elysia().use(householdsRoute);

    const res = await app.handle(
      new Request("http://localhost/households/household-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe("Updated");
  });

  it("returns 404 when the household is archived or missing", async () => {
    activeRow = null;
    const app = new Elysia().use(householdsRoute);

    const res = await app.handle(
      new Request("http://localhost/households/household-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      })
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Household not found");
  });
});
