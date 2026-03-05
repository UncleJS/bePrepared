import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { issueApiToken } from "../../lib/authToken";

const LOGIN_WINDOW_MS = Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ?? 60_000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? 5);

type LoginWindow = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, LoginWindow>();

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

function loginAttemptKey(request: Request, username: string): string {
  return `${resolveClientIp(request)}:${username.trim().toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (entry.resetAt <= now) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
  loginAttempts.set(key, entry);
}

function clearAttemptWindow(key: string): void {
  loginAttempts.delete(key);
}

// Minimal bcrypt-compatible check using the same library the frontend uses.
// We use bcryptjs on both sides so hashes are interoperable.
// At runtime we import dynamically to keep the API's Bun bundle clean.
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const { compare } = (await import("bcryptjs")) as typeof import("bcryptjs");
  return compare(plain, hash);
}

export const authRoute = new Elysia({ prefix: "/auth", tags: ["auth"] }).post(
  "/login",
  async ({ body, request, set }) => {
    const attemptKey = loginAttemptKey(request, body.username);
    if (isRateLimited(attemptKey)) {
      set.status = 429;
      return { error: "Too many login attempts. Try again shortly." };
    }

    const secret = process.env.API_AUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!secret) {
      set.status = 500;
      return { error: "Server auth secret is not configured" };
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.username, body.username), isNull(users.archivedAt)),
    });

    if (!user) {
      recordFailedAttempt(attemptKey);
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      recordFailedAttempt(attemptKey);
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    clearAttemptWindow(attemptKey);

    const token = issueApiToken(
      {
        sub: user.id,
        username: user.username,
        householdId: user.householdId,
        isAdmin: user.isAdmin,
      },
      secret,
      60 * 60 * 12
    );

    // Return safe user fields (no password hash)
    return {
      token,
      id: user.id,
      username: user.username,
      email: user.email,
      householdId: user.householdId,
      isAdmin: user.isAdmin,
    };
  },
  {
    body: t.Object({
      username: t.String({ minLength: 1, maxLength: 100 }),
      password: t.String({ minLength: 1, maxLength: 255 }),
    }),
    detail: { summary: "Authenticate with username + password" },
  }
);
