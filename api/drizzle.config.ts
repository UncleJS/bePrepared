import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "beprepared",
    password: process.env.DB_PASSWORD ?? "beprepared",
    database: process.env.DB_NAME ?? "beprepared",
  },
} satisfies Config;
