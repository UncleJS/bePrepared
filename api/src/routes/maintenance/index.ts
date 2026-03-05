import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import {
  maintenanceSchedules, maintenanceEvents, maintenanceTemplates
} from "../../db/schema";
import { eq, isNull, and, lte } from "drizzle-orm";
import { randomUUID } from "crypto";

type MaintenanceTaskType = "inspect" | "clean" | "lubricate" | "test" | "full_service" | "recharge" | "replace";

export const maintenanceRoute = new Elysia({ prefix: "/maintenance", tags: ["maintenance"] })

  .get("/templates", async () => {
    return db.query.maintenanceTemplates.findMany({
      where: isNull(maintenanceTemplates.archivedAt),
    });
  }, { detail: { summary: "List maintenance templates" } })

  .post("/templates", async ({ body }) => {
    const id = randomUUID();
    await db.insert(maintenanceTemplates).values({
      id,
      categorySlug:         body.categorySlug,
      name:                 body.name,
      description:          body.description,
      taskType:             body.taskType ? (body.taskType as MaintenanceTaskType) : undefined,
      defaultCalDays:       body.defaultCalDays,
      usageMeterUnit:       body.usageMeterUnit,
      defaultUsageInterval: body.defaultUsageInterval != null ? String(body.defaultUsageInterval) : undefined,
      graceDays:            body.graceDays,
    });
    return db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, id),
    });
  }, {
    body: t.Object({
      categorySlug:        t.String(),
      name:                t.String({ minLength: 1 }),
      description:         t.Optional(t.String()),
      taskType:            t.Optional(t.String()),
      defaultCalDays:      t.Optional(t.Number()),
      usageMeterUnit:      t.Optional(t.String()),
      defaultUsageInterval: t.Optional(t.Number()),
      graceDays:           t.Optional(t.Number()),
    }),
    detail: { summary: "Create a maintenance template" },
  })

  // Schedules per equipment item
  .get("/schedules/:equipmentItemId", async ({ params }) => {
    return db.query.maintenanceSchedules.findMany({
      where: and(
        eq(maintenanceSchedules.equipmentItemId, params.equipmentItemId),
        isNull(maintenanceSchedules.archivedAt)
      ),
    });
  }, { detail: { summary: "Get maintenance schedules for an equipment item" } })

  .post("/schedules", async ({ body }) => {
    const id = randomUUID();
    await db.insert(maintenanceSchedules).values({
      id,
      equipmentItemId: body.equipmentItemId,
      templateId:      body.templateId,
      name:            body.name,
      calDays:         body.calDays,
      usageMeterUnit:  body.usageMeterUnit,
      usageInterval:   body.usageInterval != null ? String(body.usageInterval) : undefined,
      graceDays:       body.graceDays,
      lastDoneAt:      body.lastDoneAt ? new Date(body.lastDoneAt) : undefined,
      nextDueAt:       body.nextDueAt  ? new Date(body.nextDueAt)  : undefined,
    });
    return db.query.maintenanceSchedules.findFirst({
      where: eq(maintenanceSchedules.id, id),
    });
  }, {
    body: t.Object({
      equipmentItemId: t.String(),
      templateId:      t.Optional(t.String()),
      name:            t.String({ minLength: 1 }),
      calDays:         t.Optional(t.Number()),
      usageMeterUnit:  t.Optional(t.String()),
      usageInterval:   t.Optional(t.Number()),
      graceDays:       t.Optional(t.Number()),
      lastDoneAt:      t.Optional(t.String()),
      nextDueAt:       t.Optional(t.String()),
    }),
    detail: { summary: "Create a maintenance schedule for an equipment item" },
  })

  .patch("/schedules/:id", async ({ params, body }) => {
    await db.update(maintenanceSchedules).set({
      name:       body.name,
      calDays:    body.calDays,
      graceDays:  body.graceDays,
      lastDoneAt: body.lastDoneAt ? new Date(body.lastDoneAt) : undefined,
      nextDueAt:  body.nextDueAt  ? new Date(body.nextDueAt)  : undefined,
      isActive:   body.isActive,
    }).where(eq(maintenanceSchedules.id, params.id));
    return db.query.maintenanceSchedules.findFirst({
      where: eq(maintenanceSchedules.id, params.id),
    });
  }, {
    body: t.Partial(t.Object({
      name:       t.String(),
      calDays:    t.Number(),
      graceDays:  t.Number(),
      lastDoneAt: t.String(),
      nextDueAt:  t.String(),
      isActive:   t.Boolean(),
    })),
    detail: { summary: "Update a maintenance schedule" },
  })

  // Complete maintenance (record event, advance next_due_at)
  .post("/events", async ({ body }) => {
    const id = randomUUID();
    const schedule = await db.query.maintenanceSchedules.findFirst({
      where: eq(maintenanceSchedules.id, body.scheduleId),
    });
    if (!schedule) throw new Error("Schedule not found");

    const performedDate = new Date(body.performedAt ?? new Date());
    let nextDueDate: Date | undefined;
    if (schedule.calDays) {
      nextDueDate = new Date(performedDate);
      nextDueDate.setDate(nextDueDate.getDate() + schedule.calDays);
    }

    await db.insert(maintenanceEvents).values({
      id,
      scheduleId:      body.scheduleId,
      equipmentItemId: schedule.equipmentItemId,
      performedAt:     performedDate,
      performedBy:     body.performedBy,
      meterReading:    body.meterReading != null ? String(body.meterReading) : undefined,
      nextDueAt:       nextDueDate,
      notes:           body.notes,
    });

    if (nextDueDate) {
      await db.update(maintenanceSchedules)
        .set({
          lastDoneAt:     performedDate,
          nextDueAt:      nextDueDate,
          lastMeterValue: body.meterReading != null ? String(body.meterReading) : undefined,
        })
        .where(eq(maintenanceSchedules.id, body.scheduleId));
    }

    return db.query.maintenanceEvents.findFirst({ where: eq(maintenanceEvents.id, id) });
  }, {
    body: t.Object({
      scheduleId:   t.String(),
      performedAt:  t.Optional(t.String()),
      performedBy:  t.Optional(t.String()),
      meterReading: t.Optional(t.Number()),
      notes:        t.Optional(t.String()),
    }),
    detail: { summary: "Record a completed maintenance event and advance next due date" },
  })

  .get("/events/:scheduleId", async ({ params }) => {
    return db.query.maintenanceEvents.findMany({
      where: and(
        eq(maintenanceEvents.scheduleId, params.scheduleId),
        isNull(maintenanceEvents.archivedAt)
      ),
    });
  }, { detail: { summary: "Get maintenance history for a schedule" } })

  // Due soon queue
  .get("/due/:householdId", async ({ params, query }) => {
    const days = Number(query.days ?? 14);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return db.query.maintenanceSchedules.findMany({
      where: and(
        isNull(maintenanceSchedules.archivedAt),
        lte(maintenanceSchedules.nextDueAt, cutoff),
      ),
    });
  }, {
    query: t.Object({ days: t.Optional(t.String()) }),
    detail: { summary: "Get maintenance schedules due within N days" },
  });
