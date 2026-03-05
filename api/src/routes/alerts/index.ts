import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { alerts } from "../../db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const alertsRoute = new Elysia({ prefix: "/alerts", tags: ["alerts"] })

  .get("/:householdId", async ({ params, query }) => {
    const rows = await db.query.alerts.findMany({
      where: and(
        eq(alerts.householdId, params.householdId),
        isNull(alerts.archivedAt)
      ),
      orderBy: alerts.dueAt,
    });
    if (query.unread === "true") return rows.filter(r => !r.isRead);
    if (query.unresolved === "true") return rows.filter(r => !r.isResolved);
    return rows;
  }, {
    query: t.Object({
      unread:     t.Optional(t.String()),
      unresolved: t.Optional(t.String()),
    }),
    detail: { summary: "Get all alerts for a household" },
  })

  .patch("/:householdId/:alertId/read", async ({ params }) => {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, params.alertId));
    return { read: true };
  }, { detail: { summary: "Mark an alert as read" } })

  .patch("/:householdId/:alertId/resolve", async ({ params }) => {
    await db.update(alerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(alerts.id, params.alertId));
    return { resolved: true };
  }, { detail: { summary: "Mark an alert as resolved" } })

  .delete("/:householdId/:alertId", async ({ params }) => {
    await db.update(alerts)
      .set({ archivedAt: new Date() })
      .where(eq(alerts.id, params.alertId));
    return { archived: true };
  }, { detail: { summary: "Archive (dismiss) an alert" } });
