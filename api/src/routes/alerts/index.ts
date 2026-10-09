import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { alerts } from "../../db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { requireHouseholdScope, requireAdmin } from "../../lib/routeAuth";
import { runAllJobs } from "../../lib/alertJobs";
import { DEFAULT_LIST_LIMIT, markTruncated, mysqlAffectedRows } from "../../lib/listLimits";

export const alertsRoute = new Elysia({ prefix: "/alerts", tags: ["alerts"] })

  .get(
    "/:householdId",
    async ({ request, set, params, query }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const filters = [eq(alerts.householdId, params.householdId), isNull(alerts.archivedAtUTC)];
      if (query.status === "active" || query.unresolved === "true") {
        filters.push(eq(alerts.isResolved, false));
      } else if (query.status === "resolved") {
        filters.push(eq(alerts.isResolved, true));
      }
      if (query.unread === "true") filters.push(eq(alerts.isRead, false));

      const rows = await db.query.alerts.findMany({
        where: and(...filters),
        orderBy: [alerts.dueAtUTC, desc(alerts.id)],
        limit: DEFAULT_LIST_LIMIT,
      });
      markTruncated(set, rows.length);
      return rows;
    },
    {
      query: t.Object({
        status: t.Optional(t.Union([t.Literal("active"), t.Literal("resolved")])),
        unread: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
        unresolved: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
      }),
      detail: { summary: "Get all alerts for a household" },
    }
  )

  .patch(
    "/:householdId/:alertId/read",
    async ({ request, set, params }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const result = await db
        .update(alerts)
        .set({ isRead: true })
        .where(
          and(
            eq(alerts.id, params.alertId),
            eq(alerts.householdId, params.householdId),
            isNull(alerts.archivedAtUTC)
          )
        );
      if (mysqlAffectedRows(result) === 0) {
        set.status = 404;
        return { error: "Alert not found" };
      }
      return { read: true };
    },
    { detail: { summary: "Mark an alert as read" } }
  )

  .patch(
    "/:householdId/:alertId/resolve",
    async ({ request, set, params }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const result = await db
        .update(alerts)
        .set({ isResolved: true, resolvedAtUTC: new Date() })
        .where(
          and(
            eq(alerts.id, params.alertId),
            eq(alerts.householdId, params.householdId),
            isNull(alerts.archivedAtUTC)
          )
        );
      if (mysqlAffectedRows(result) === 0) {
        set.status = 404;
        return { error: "Alert not found" };
      }
      return { resolved: true };
    },
    { detail: { summary: "Mark an alert as resolved" } }
  )

  .delete(
    "/:householdId/:alertId",
    async ({ request, set, params }) => {
      const claims = await requireHouseholdScope(request, set, params.householdId);
      if (!claims) return { error: "Forbidden" };

      const result = await db
        .update(alerts)
        .set({ archivedAtUTC: new Date() })
        .where(
          and(
            eq(alerts.id, params.alertId),
            eq(alerts.householdId, params.householdId),
            isNull(alerts.archivedAtUTC)
          )
        );
      if (mysqlAffectedRows(result) === 0) {
        set.status = 404;
        return { error: "Alert not found" };
      }
      return { archived: true };
    },
    { detail: { summary: "Archive (dismiss) an alert" } }
  )

  .post(
    "/run-job",
    async ({ request, set }) => {
      const claims = requireAdmin(request, set);
      if (!claims) return { error: "Forbidden" };

      try {
        const metrics = await runAllJobs();
        return { ok: true, metrics };
      } catch (err) {
        if (err instanceof Error && err.message.includes("already running")) {
          set.status = 409;
          return { error: err.message };
        }
        throw err;
      }
    },
    { detail: { summary: "Deprecated alias for admin alert job trigger" } }
  );

export const adminAlertsRoute = new Elysia({ prefix: "/admin/alerts", tags: ["alerts"] }).post(
  "/run-job",
  async ({ request, set }) => {
    const claims = requireAdmin(request, set);
    if (!claims) return { error: "Forbidden" };

    try {
      const metrics = await runAllJobs();
      return { ok: true, metrics };
    } catch (err) {
      if (err instanceof Error && err.message.includes("already running")) {
        set.status = 409;
        return { error: err.message };
      }
      throw err;
    }
  },
  { detail: { summary: "Manually trigger alert job run (admin only)" } }
);
