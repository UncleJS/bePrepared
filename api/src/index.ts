import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { bearerFromHeader, verifyApiToken } from "./lib/authToken";
import { setRequestClaims } from "./lib/authContext";
import { db } from "./db/client";
import { users } from "./db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { logger } from "./lib/logger";

import { authRoute } from "./routes/auth";
import { usersRoute } from "./routes/users";
import { householdsRoute } from "./routes/households";
import { modulesRoute } from "./routes/modules";
import { moduleCategoriesRoute } from "./routes/modules/categories";
import { tasksRoute } from "./routes/tasks";
import { inventoryRoute } from "./routes/inventory";
import { equipmentRoute } from "./routes/equipment";
import { maintenanceRoute } from "./routes/maintenance";
import { alertsRoute } from "./routes/alerts";
import { settingsRoute } from "./routes/settings";
import { planningRoute } from "./routes/planning";

const PORT = Number(process.env.PORT ?? 3001);
const NODE_ENV = (process.env.NODE_ENV ?? "development").toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";
const AUTH_ENABLED = (process.env.AUTH_ENABLED ?? "true") === "true";
const API_AUTH_SECRET = process.env.API_AUTH_SECRET ?? process.env.AUTH_SECRET;
const ALLOW_LOCALHOST_CORS_IN_PRODUCTION =
  (process.env.ALLOW_LOCALHOST_CORS_IN_PRODUCTION ?? "false") === "true";
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:9999")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (AUTH_ENABLED && !API_AUTH_SECRET) {
  throw new Error("API auth is enabled but API_AUTH_SECRET/AUTH_SECRET is not set.");
}

if (NODE_ENV === "production" && !AUTH_ENABLED) {
  throw new Error("AUTH_ENABLED=false is not allowed in production.");
}

if (IS_PRODUCTION) {
  if (CORS_ORIGINS.length === 0) {
    throw new Error("CORS_ORIGINS must include at least one explicit origin in production.");
  }
  if (CORS_ORIGINS.includes("*")) {
    throw new Error("CORS_ORIGINS cannot include '*' in production.");
  }
  const hasLocalhostOrigin = CORS_ORIGINS.some((origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  );
  if (hasLocalhostOrigin && !ALLOW_LOCALHOST_CORS_IN_PRODUCTION) {
    throw new Error(
      "CORS_ORIGINS contains localhost in production. Set real origins or set ALLOW_LOCALHOST_CORS_IN_PRODUCTION=true intentionally."
    );
  }
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/health" ||
    pathname === "/auth/login" ||
    (!IS_PRODUCTION && pathname.startsWith("/docs"))
  );
}

const app = new Elysia()
  .derive(({ request }) => {
    if (!AUTH_ENABLED || !API_AUTH_SECRET) return { auth: null };
    const token = bearerFromHeader(request.headers.get("authorization"));
    if (!token) return { auth: null };
    return { auth: verifyApiToken(token, API_AUTH_SECRET) };
  })
  .onBeforeHandle(async ({ request, set, auth }) => {
    if (!AUTH_ENABLED) return;
    const pathname = new URL(request.url).pathname;
    if (isPublicPath(pathname)) return;
    if (!auth) {
      setRequestClaims(request, null);
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const dbUser = await db.query.users.findFirst({
      where: and(eq(users.id, auth.sub), isNull(users.archivedAt)),
    });
    if (!dbUser) {
      setRequestClaims(request, null);
      set.status = 401;
      return { error: "Unauthorized" };
    }

    setRequestClaims(request, {
      sub: dbUser.id,
      username: dbUser.username,
      householdId: dbUser.householdId,
      isAdmin: dbUser.isAdmin,
      iat: auth.iat,
      exp: auth.exp,
    });
  })
  .use(cors({ origin: CORS_ORIGINS, credentials: true }))
  .use(
    swagger({
      documentation: {
        info: {
          title: "bePrepared API",
          version: "0.1.0",
          description: "Disaster preparedness system — household readiness API",
          license: {
            name: "CC BY-NC-SA 4.0",
            url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
          },
        },
        tags: [
          { name: "auth", description: "Authentication" },
          { name: "users", description: "User management" },
          { name: "households", description: "Household management" },
          { name: "modules", description: "Preparedness modules and guidance" },
          { name: "tasks", description: "Ticksheets and task progression" },
          { name: "inventory", description: "Inventory items and lots" },
          { name: "equipment", description: "Equipment items and battery profiles" },
          { name: "maintenance", description: "Maintenance schedules and events" },
          { name: "alerts", description: "Alert queue management" },
          { name: "settings", description: "Household policies and people profiles" },
          { name: "planning", description: "Effective totals and planning calculations" },
        ],
      },
      path: "/docs",
      swaggerOptions: { tryItOutEnabled: !IS_PRODUCTION },
    })
  )
  .get("/", () => ({ status: "ok", name: "bePrepared API", version: "0.1.0" }))
  .get("/health", async ({ set }) => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: "ok", ts: new Date().toISOString() };
    } catch (err) {
      logger.error("Health probe DB check failed", { err: String(err) });
      set.status = 503;
      return { status: "error", ts: new Date().toISOString() };
    }
  })
  .use(authRoute)
  .use(usersRoute)
  .use(householdsRoute)
  .use(modulesRoute)
  .use(moduleCategoriesRoute)
  .use(tasksRoute)
  .use(inventoryRoute)
  .use(equipmentRoute)
  .use(maintenanceRoute)
  .use(alertsRoute)
  .use(settingsRoute)
  .use(planningRoute)
  .listen(PORT);

logger.info("bePrepared API running", { url: `http://localhost:${PORT}` });
logger.info("Swagger UI", { url: `http://localhost:${PORT}/docs` });
logger.info("OpenAPI JSON", { url: `http://localhost:${PORT}/docs/json` });
