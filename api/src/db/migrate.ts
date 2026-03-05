import { migrate } from "drizzle-orm/mysql2/migrator";
import { db } from "./client";
import path from "path";

const migrationsFolder = path.join(import.meta.dir, "migrations");

console.log("Running DB migrations from:", migrationsFolder);

await migrate(db, { migrationsFolder });

console.log("Migrations complete.");
process.exit(0);
