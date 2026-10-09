import { beforeEach, describe, expect, it, mock } from "bun:test";
import { hash } from "bcryptjs";

process.env.NODE_ENV = "test";
process.env.AUTH_ENABLED = "true";
process.env.AUTH_SECRET = "e2e-auth-secret";
process.env.API_AUTH_SECRET = "e2e-auth-secret";
delete process.env.TRUST_PROXY;

type UserRow = {
  id: string;
  username: string;
  householdId: string;
  isAdmin: boolean;
  passwordHash: string;
  credentialsVersion: number;
  email: string | null;
  archivedAtUTC: Date | null;
};

let user: UserRow | null = null;
let profile: { id: string; householdId: string } | null = null;
let item: { id: string } | null = null;
let householdArchivedAt: Date | null = null;
let otherAdmins: UserRow[] = [];
const updates: Record<string, unknown>[] = [];
const queries: { alerts?: unknown; audit?: unknown; lots?: unknown } = {};

const db = {
  select: () => ({
    from: () => ({
      limit: async () => [{ id: "module-1" }],
    }),
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        updates.push(values);
        if (user) Object.assign(user, values);
      },
    }),
  }),
  insert: () => ({
    values: async () => undefined,
  }),
  transaction: async (fn: (tx: object) => Promise<void>) => fn(db),
  query: {
    users: {
      findFirst: async () => user,
      findMany: async () => otherAdmins,
    },
    households: {
      findFirst: async () => ({
        id: "household-1",
        name: "Home",
        archivedAtUTC: householdArchivedAt,
      }),
    },
    householdPeopleProfiles: { findFirst: async () => profile },
    inventoryItems: {
      findFirst: async () => item,
      findMany: async () => [],
    },
    inventoryLots: {
      findFirst: async () => ({ id: "lot-1" }),
      findMany: async (query: unknown) => {
        queries.lots = query;
        return [];
      },
    },
    alerts: {
      findMany: async (query: unknown) => {
        queries.alerts = query;
        return [{ id: "alert-1", isResolved: true, isRead: true }];
      },
    },
    auditLog: {
      findMany: async (query: unknown) => {
        queries.audit = query;
        return [];
      },
    },
  },
};

mock.module("./db/client", () => ({ db }));
mock.module("../db/client", () => ({ db }));
mock.module("../../db/client", () => ({ db }));

const { createApp } = await import("./index");
const { issueApiToken } = await import("./lib/authToken");
const { clearLoginAttempts } = await import("./routes/auth");

const app = createApp();
const HOUSEHOLD = "household-1";
const PROFILE = "22222222-2222-2222-2222-222222222222";
const ITEM = "33333333-3333-3333-3333-333333333333";

function bearerFor(row: UserRow): string {
  return issueApiToken(
    {
      sub: row.id,
      username: row.username,
      householdId: row.householdId,
      isAdmin: row.isAdmin,
      credentialsVersion: row.credentialsVersion,
    },
    "e2e-auth-secret",
    60 * 60
  );
}

beforeEach(() => {
  clearLoginAttempts();
  profile = null;
  item = null;
  householdArchivedAt = null;
  otherAdmins = [];
  updates.length = 0;
  queries.alerts = undefined;
  queries.audit = undefined;
  queries.lots = undefined;
  user = null;
});

describe("authz over HTTP", () => {
  it("rejects household archive from a member and allows an admin", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };

    const denied = await app.handle(
      new Request(`http://localhost/households/${HOUSEHOLD}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(denied.status).toBe(403);

    user.isAdmin = true;
    const allowed = await app.handle(
      new Request(`http://localhost/households/${HOUSEHOLD}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(allowed.status).toBe(200);
  });

  it("rejects an activeProfileId from another household", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };
    profile = null;

    const res = await app.handle(
      new Request(`http://localhost/households/${HOUSEHOLD}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${bearerFor(user)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ activeProfileId: PROFILE }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a lot whose item is not in the household", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };
    item = null;

    const res = await app.handle(
      new Request(`http://localhost/inventory/${HOUSEHOLD}/items/${ITEM}/lots`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${bearerFor(user)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ qty: 1 }),
      })
    );
    expect(res.status).toBe(404);
  });

  it("invalidates the previous token after a password change", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: await hash("old-password-1", 4),
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };
    const oldToken = bearerFor(user);

    const changed = await app.handle(
      new Request("http://localhost/users/me", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${oldToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password: "new-password-1",
          currentPassword: "old-password-1",
        }),
      })
    );
    expect(changed.status).toBe(200);
    const body = (await changed.json()) as { token?: string };
    expect(body.token).toBeTruthy();

    const stale = await app.handle(
      new Request("http://localhost/users/me", {
        headers: { authorization: `Bearer ${oldToken}` },
      })
    );
    expect(stale.status).toBe(401);

    const fresh = await app.handle(
      new Request("http://localhost/users/me", {
        headers: { authorization: `Bearer ${body.token}` },
      })
    );
    expect(fresh.status).toBe(200);
  });

  it("keeps validation errors instead of a generic 500", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "" }),
      })
    );
    expect(res.status).not.toBe(500);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rate limits login by username and ignores a forged X-Forwarded-For", async () => {
    user = null;
    for (let i = 0; i < 5; i++) {
      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `10.0.0.${i}`,
          },
          body: JSON.stringify({ username: "nobody", password: "wrong-password" }),
        })
      );
      expect(res.status).toBe(401);
    }

    const limited = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.9.9.9",
        },
        body: JSON.stringify({ username: "nobody", password: "wrong-password" }),
      })
    );
    expect(limited.status).toBe(429);
  });

  it("filters alerts in the query instead of after the row cap", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };

    const res = await app.handle(
      new Request(`http://localhost/alerts/${HOUSEHOLD}?status=active`, {
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ isResolved: boolean }>;
    expect(body).toHaveLength(1);
    const query = queries.alerts as { limit?: number; where?: unknown };
    expect(query.limit).toBe(500);
    expect(query.where).toBeDefined();
  });

  it("returns the audit log newest first", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };

    const res = await app.handle(
      new Request(`http://localhost/settings/${HOUSEHOLD}/audit`, {
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(res.status).toBe(200);
    const query = queries.audit as {
      limit?: number;
      orderBy?: { queryChunks?: Array<{ value?: string[] }> };
    };
    expect(query.limit).toBe(500);
    const direction = query.orderBy?.queryChunks
      ?.map((chunk) => chunk.value?.join("") ?? "")
      .join("");
    expect(direction?.toLowerCase()).toContain("desc");
  });

  it("blocks a member from an archived household and still allows an admin", async () => {
    householdArchivedAt = new Date("2026-01-01T00:00:00.000Z");
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };

    const denied = await app.handle(
      new Request(`http://localhost/inventory/${HOUSEHOLD}/items`, {
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(denied.status).toBe(403);

    user.isAdmin = true;
    const allowed = await app.handle(
      new Request(`http://localhost/inventory/${HOUSEHOLD}/items`, {
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(allowed.status).toBe(200);
  });

  it("refuses to demote the last admin", async () => {
    user = {
      id: "user-1",
      username: "admin",
      householdId: HOUSEHOLD,
      isAdmin: true,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };
    otherAdmins = [];

    const res = await app.handle(
      new Request("http://localhost/users/user-1", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${bearerFor(user)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ isAdmin: false }),
      })
    );
    expect(res.status).toBe(409);
  });

  it("archives an item's lots in the same transaction", async () => {
    user = {
      id: "user-1",
      username: "member",
      householdId: HOUSEHOLD,
      isAdmin: false,
      passwordHash: "x",
      credentialsVersion: 1,
      email: null,
      archivedAtUTC: null,
    };

    const res = await app.handle(
      new Request(`http://localhost/inventory/${HOUSEHOLD}/items/${ITEM}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${bearerFor(user)}` },
      })
    );
    expect(res.status).toBe(200);
    const archived = updates.filter((row) => "archivedAtUTC" in row);
    expect(archived).toHaveLength(2);
  });
});
