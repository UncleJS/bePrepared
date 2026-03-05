import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { createHash } from "crypto";

// Minimal bcrypt-compatible check using the same library the frontend uses.
// We use bcryptjs on both sides so hashes are interoperable.
// At runtime we import dynamically to keep the API's Bun bundle clean.
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const { compare } = await import("bcryptjs") as typeof import("bcryptjs");
  return compare(plain, hash);
}

export const authRoute = new Elysia({ prefix: "/auth", tags: ["auth"] })

  .post("/login", async ({ body, set }) => {
    const user = await db.query.users.findFirst({
      where: and(eq(users.username, body.username), isNull(users.archivedAt)),
    });

    if (!user) {
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    // Return safe user fields (no password hash)
    return {
      id:          user.id,
      username:    user.username,
      email:       user.email,
      householdId: user.householdId,
      isAdmin:     user.isAdmin,
    };
  }, {
    body: t.Object({
      username: t.String({ minLength: 1 }),
      password: t.String({ minLength: 1 }),
    }),
    detail: { summary: "Authenticate with username + password" },
  });
