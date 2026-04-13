/**
 * seeds/users.ts — seed the demo admin user for the demo household.
 *
 * Credentials:
 * - username: admin
 * - password: SEED_ADMIN_PASSWORD (recommended), otherwise random one-time password in non-production
 */
import { db } from "../client";
import { users } from "../schema";
import { randomUUID, randomBytes } from "crypto";

async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(plain, 12);
}

export async function seedUsers() {
  console.log("  Seeding demo admin user...");

  const id = "demo-user-001";
  const householdId = "00000000-0000-0000-0000-000000000001";
  const username = "admin";
  const configuredPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  const generatedPassword = randomBytes(18).toString("base64url");
  const usingGeneratedPassword = !configuredPassword;
  const rawPassword = configuredPassword || generatedPassword;

  if ((process.env.NODE_ENV ?? "").toLowerCase() === "production" && usingGeneratedPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required in production.");
  }
  if (rawPassword === "changeme") {
    throw new Error("SEED_ADMIN_PASSWORD cannot be 'changeme'.");
  }
  const passwordHash = await hashPassword(rawPassword);

  await db
    .insert(users)
    .values({
      id,
      householdId,
      username,
      email: "admin@localhost",
      passwordHash,
      isAdmin: true,
    })
    .onDuplicateKeyUpdate({
      set: {
        email: "admin@localhost",
        isAdmin: true,
        passwordHash,
        householdId,
      },
    });

  if (usingGeneratedPassword) {
    console.log(`  ✓ Admin user '${username}' (generated password: ${rawPassword})`);
    console.log("    Set SEED_ADMIN_PASSWORD to a strong value for stable credentials.");
    return;
  }

  console.log(`  ✓ Admin user '${username}' (password from SEED_ADMIN_PASSWORD)`);
}
