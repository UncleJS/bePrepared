import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { alerts } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { requireHouseholdScope } from "../../lib/routeAuth";

export const alertsRoute = new Elysia({ prefix: "/alerts", tags: ["alerts"] })

  .get("/:householdId", async ({ request, set, params, query }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    const rows = await db.query.alerts.findMany({
      where: and(
        eq(alerts.householdId, params.householdId),
        isNull(alerts.archivedAt)
      ),
      orderBy: alerts.dueAt,
    });
    if (query.status === "active") return rows.filter(r => !r.isResolved);
    if (query.status === "resolved") return rows.filter(r => r.isResolved);
    if (query.unread === "true") return rows.filter(r => !r.isRead);
    if (query.unresolved === "true") return rows.filter(r => !r.isResolved);
    return rows;
  }, {
    query: t.Object({
      status:     t.Optional(t.Union([t.Literal("active"), t.Literal("resolved")])),
      unread:     t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
      unresolved: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
    }),
    detail: { summary: "Get all alerts for a household" },
  })

  .patch("/:householdId/:alertId/read", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    await db.update(alerts)
      .set({ isRead: true })
      .where(and(eq(alerts.id, params.alertId), eq(alerts.householdId, params.householdId)));
    return { read: true };
  }, { detail: { summary: "Mark an alert as read" } })

  .patch("/:householdId/:alertId/resolve", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    await db.update(alerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(and(eq(alerts.id, params.alertId), eq(alerts.householdId, params.householdId)));
    return { resolved: true };
  }, { detail: { summary: "Mark an alert as resolved" } })

  .delete("/:householdId/:alertId", async ({ request, set, params }) => {
    const claims = requireHouseholdScope(request, set, params.householdId);
    if (!claims) return { error: "Forbidden" };

    await db.update(alerts)
      .set({ archivedAt: new Date() })
      .where(and(eq(alerts.id, params.alertId), eq(alerts.householdId, params.householdId)));
    return { archived: true };
  }, { detail: { summary: "Archive (dismiss) an alert" } });
