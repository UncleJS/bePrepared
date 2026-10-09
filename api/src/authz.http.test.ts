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
const updates: Record<string, unknown>[] = [];

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
  query: {
    users: { findFirst: async () => user },
    households: {
      findFirst: async () => ({ id: "household-1", name: "Home", archivedAtUTC: null }),
    },
    householdPeopleProfiles: { findFirst: async () => profile },
    inventoryItems: { findFirst: async () => item },
    inventoryLots: { findFirst: async () => ({ id: "lot-1" }) },
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
  updates.length = 0;
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
});
