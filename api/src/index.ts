import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";

import { authRoute }         from "./routes/auth";
import { householdsRoute }   from "./routes/households";
import { modulesRoute }      from "./routes/modules";
import { tasksRoute }        from "./routes/tasks";
import { inventoryRoute }    from "./routes/inventory";
import { equipmentRoute }    from "./routes/equipment";
import { maintenanceRoute }  from "./routes/maintenance";
import { alertsRoute }       from "./routes/alerts";
import { settingsRoute }     from "./routes/settings";
import { planningRoute }     from "./routes/planning";

const PORT = Number(process.env.PORT ?? 3001);

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title:       "bePrepared API",
          version:     "0.1.0",
          description: "Disaster preparedness system — household readiness API",
          license: {
            name: "CC BY-NC-SA 4.0",
            url:  "https://creativecommons.org/licenses/by-nc-sa/4.0/",
          },
        },
        tags: [
          { name: "auth",        description: "Authentication" },
          { name: "households",  description: "Household management" },
          { name: "modules",     description: "Preparedness modules and guidance" },
          { name: "tasks",       description: "Ticksheets and task progression" },
          { name: "inventory",   description: "Inventory items and lots" },
          { name: "equipment",   description: "Equipment items and battery profiles" },
          { name: "maintenance", description: "Maintenance schedules and events" },
          { name: "alerts",      description: "Alert queue management" },
          { name: "settings",    description: "Household policies and people profiles" },
          { name: "planning",    description: "Effective totals and planning calculations" },
        ],
      },
      path:     "/docs",
      swaggerOptions: { tryItOutEnabled: true },
    })
  )
  .get("/",         () => ({ status: "ok", name: "bePrepared API", version: "0.1.0" }))
  .get("/health",   () => ({ status: "ok", ts: new Date().toISOString() }))
  .use(authRoute)
  .use(householdsRoute)
  .use(modulesRoute)
  .use(tasksRoute)
  .use(inventoryRoute)
  .use(equipmentRoute)
  .use(maintenanceRoute)
  .use(alertsRoute)
  .use(settingsRoute)
  .use(planningRoute)
  .listen(PORT);

console.log(`bePrepared API running on http://localhost:${PORT}`);
console.log(`Swagger UI:   http://localhost:${PORT}/docs`);
console.log(`OpenAPI JSON: http://localhost:${PORT}/docs/json`);
