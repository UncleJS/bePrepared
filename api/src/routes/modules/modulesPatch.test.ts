import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

// Track whether findFirst should behave as "active row exists" or "archived/missing"
let activeModule: Record<string, unknown> | null = null;
let activeCategory: Record<string, unknown> | null = null;

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
      modules: { findFirst: async () => activeModule },
      moduleCategories: { findFirst: async () => activeCategory },
    },
  },
}));

const { modulesRoute } = await import("./index");
const { moduleCategoriesRoute } = await import("./categories");

describe("modules PATCH archive handling", () => {
  it("returns the updated module when active", async () => {
    activeModule = { id: "module-1", title: "Updated" };
    const app = new Elysia().use(modulesRoute);

    const res = await app.handle(
      new Request("http://localhost/modules/module-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string };
    expect(body.title).toBe("Updated");
  });

  it("returns 404 when the module is archived or missing", async () => {
    activeModule = null;
    const app = new Elysia().use(modulesRoute);

    const res = await app.handle(
      new Request("http://localhost/modules/module-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      })
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Module not found");
  });
});

describe("module categories PATCH archive handling", () => {
  it("returns the updated category when active", async () => {
    activeCategory = { id: "cat-1", title: "Updated" };
    const app = new Elysia().use(moduleCategoriesRoute);

    const res = await app.handle(
      new Request("http://localhost/module-categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string };
    expect(body.title).toBe("Updated");
  });

  it("returns 404 when the category is archived or missing", async () => {
    activeCategory = null;
    const app = new Elysia().use(moduleCategoriesRoute);

    const res = await app.handle(
      new Request("http://localhost/module-categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      })
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Module category not found");
  });
});
