import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { eq, isNull, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, requireAuth } from "../../lib/routeAuth";
import { issueApiToken } from "../../lib/authToken";

/** Strip secrets before returning a user record */
function safeUser(user: typeof users.$inferSelect) {
  const { passwordHash: _omit, credentialsVersion: _version, ...safe } = user;
  return safe;
}

function signingSecret(): string | null {
  return process.env.API_AUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

function issueTokenFor(user: typeof users.$inferSelect): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  return issueApiToken(
    {
      sub: user.id,
      username: user.username,
      householdId: user.householdId,
      isAdmin: user.isAdmin,
      credentialsVersion: user.credentialsVersion,
    },
    secret,
    60 * 60 * 12
  );
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const { compare } = (await import("bcryptjs")) as typeof import("bcryptjs");
  return compare(plain, hash);
}

async function hashPassword(plain: string): Promise<string> {
  const { hash } = (await import("bcryptjs")) as typeof import("bcryptjs");
  return hash(plain, 12);
}

export const usersRoute = new Elysia({ prefix: "/users", tags: ["users"] })

  // GET /users — admin only; all non-archived users
  .get(
    "/",
    async ({ request, set }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const rows = await db.query.users.findMany({
        where: isNull(users.archivedAtUTC),
      });
      return rows.map(safeUser);
    },
    { detail: { summary: "List all active users (admin only)" } }
  )

  // GET /users/me — any authenticated user
  .get(
    "/me",
    async ({ request, set }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const user = await db.query.users.findFirst({
        where: and(eq(users.id, claims.sub), isNull(users.archivedAtUTC)),
      });
      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }
      return safeUser(user);
    },
    { detail: { summary: "Get own user profile" } }
  )

  // PATCH /users/me — any authenticated user; update own email, username, password
  .patch(
    "/me",
    async ({ request, set, body }) => {
      const claims = requireAuth(request, set);
      if (!claims) return { error: "Unauthorized" };

      const existing = await db.query.users.findFirst({
        where: and(eq(users.id, claims.sub), isNull(users.archivedAtUTC)),
      });
      if (!existing) {
        set.status = 404;
        return { error: "User not found" };
      }

      const updates: Partial<typeof users.$inferInsert> = {};
      if (body.email !== undefined) updates.email = body.email;
      if (body.username !== undefined) updates.username = body.username;
      if (body.password) {
        if (!body.currentPassword) {
          set.status = 400;
          return { error: "Current password is required" };
        }
        const matches = await verifyPassword(body.currentPassword, existing.passwordHash);
        if (!matches) {
          set.status = 401;
          return { error: "Invalid current password" };
        }
        updates.passwordHash = await hashPassword(body.password);
        updates.credentialsVersion = existing.credentialsVersion + 1;
      }

      if (Object.keys(updates).length === 0) {
        set.status = 400;
        return { error: "No fields to update" };
      }

      await db.update(users).set(updates).where(eq(users.id, claims.sub));

      const updated = await db.query.users.findFirst({
        where: and(eq(users.id, claims.sub), isNull(users.archivedAtUTC)),
      });
      if (!updated) {
        set.status = 404;
        return { error: "User not found" };
      }
      const token = body.password ? issueTokenFor(updated) : null;
      return token ? { ...safeUser(updated), token } : safeUser(updated);
    },
    {
      body: t.Partial(
        t.Object({
          email: t.String({ maxLength: 255 }),
          username: t.String({ minLength: 1, maxLength: 100 }),
          password: t.String({ minLength: 8, maxLength: 255 }),
          currentPassword: t.String({ minLength: 1, maxLength: 255 }),
        })
      ),
      detail: { summary: "Update own profile (email, username, password)" },
    }
  )

  // POST /users — admin only; create a new user
  .post(
    "/",
    async ({ request, set, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const passwordHash = await hashPassword(body.password);
      const id = randomUUID();

      await db.insert(users).values({
        id,
        householdId: body.householdId,
        username: body.username,
        email: body.email ?? null,
        passwordHash,
        isAdmin: body.isAdmin ?? false,
      });

      const created = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (!created) {
        set.status = 500;
        return { error: "Failed to retrieve created user" };
      }
      return safeUser(created);
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1, maxLength: 100 }),
        password: t.String({ minLength: 8, maxLength: 255 }),
        householdId: t.String({ minLength: 1, maxLength: 36 }),
        email: t.Optional(t.String({ maxLength: 255 })),
        isAdmin: t.Optional(t.Boolean()),
      }),
      detail: { summary: "Create a new user (admin only)" },
    }
  )

  // PATCH /users/:id — admin only; update any user
  .patch(
    "/:id",
    async ({ request, set, params, body }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      const existing = await db.query.users.findFirst({
        where: and(eq(users.id, params.id), isNull(users.archivedAtUTC)),
      });
      if (!existing) {
        set.status = 404;
        return { error: "User not found" };
      }

      const updates: Partial<typeof users.$inferInsert> = {};
      if (body.email !== undefined) updates.email = body.email;
      if (body.username !== undefined) updates.username = body.username;
      if (body.password) {
        updates.passwordHash = await hashPassword(body.password);
        updates.credentialsVersion = existing.credentialsVersion + 1;
      }
      if (body.householdId !== undefined) updates.householdId = body.householdId;
      if (body.isAdmin !== undefined) updates.isAdmin = body.isAdmin;

      if (Object.keys(updates).length === 0) {
        set.status = 400;
        return { error: "No fields to update" };
      }

      await db.update(users).set(updates).where(eq(users.id, params.id));

      const updated = await db.query.users.findFirst({
        where: and(eq(users.id, params.id), isNull(users.archivedAtUTC)),
      });
      if (!updated) {
        set.status = 404;
        return { error: "User not found" };
      }
      const token = body.password && updated.id === claims.sub ? issueTokenFor(updated) : null;
      return token ? { ...safeUser(updated), token } : safeUser(updated);
    },
    {
      body: t.Partial(
        t.Object({
          email: t.String({ maxLength: 255 }),
          username: t.String({ minLength: 1, maxLength: 100 }),
          password: t.String({ minLength: 8, maxLength: 255 }),
          householdId: t.String({ minLength: 1, maxLength: 36 }),
          isAdmin: t.Boolean(),
        })
      ),
      detail: { summary: "Update a user (admin only)" },
    }
  )

  // DELETE /users/:id — admin only; soft-archive (cannot archive self)
  .delete(
    "/:id",
    async ({ request, set, params }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Admin access required" };

      if (params.id === claims.sub) {
        set.status = 400;
        return { error: "Cannot archive your own account" };
      }

      const existing = await db.query.users.findFirst({
        where: and(eq(users.id, params.id), isNull(users.archivedAtUTC)),
      });
      if (!existing) {
        set.status = 404;
        return { error: "User not found" };
      }

      await db
        .update(users)
        .set({ archivedAtUTC: new Date() })
        .where(and(eq(users.id, params.id), ne(users.id, claims.sub)));

      return { archived: true };
    },
    { detail: { summary: "Archive (soft-delete) a user (admin only, cannot archive self)" } }
  );
