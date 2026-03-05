/**
 * seeds/users.ts — seed the demo admin user for the demo household.
 *
 * Default credentials:  admin / changeme
 * Change via the API after first login.
 */
import { db } from "../client";
import { users } from "../schema";
import { randomUUID } from "crypto";

async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(plain, 12);
}

export async function seedUsers() {
  console.log("  Seeding demo admin user...");

  const id           = "demo-user-001";
  const householdId  = "demo-household-001";
  const username     = "admin";
  const rawPassword  = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await hashPassword(rawPassword);

  await db.insert(users).values({
    id,
    householdId,
    username,
    email:        "admin@localhost",
    passwordHash,
    isAdmin:      true,
  }).onDuplicateKeyUpdate({
    set: {
      email: "admin@localhost",
      isAdmin: true,
      passwordHash,
      householdId,
    },
  });

  console.log(`  ✓ Admin user '${username}' (password: ${rawPassword === "changeme" ? "changeme — CHANGE THIS" : "***"})`);
}
